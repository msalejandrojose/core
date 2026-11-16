import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvalidRoutineError,
  cleanRoutine,
  hevyRoutineFrom,
  kindMatches,
  routineMuscles,
  type MuscleShare,
  type RoutineInput,
} from '../../domain/services/routine';
import {
  BRIO_ROUTINE_REPOSITORY,
  type BrioRoutineRepositoryPort,
  type RoutineView,
} from '../ports/routine.port';
import {
  BRIO_HEVY_REPOSITORY,
  BRIO_SECRET_CIPHER,
  HEVY_CLIENT,
  HevyApiError,
  type BrioHevyRepositoryPort,
  type HevyClientPort,
  type SecretCipher,
} from '../ports/hevy.port';
import { hevyHttpError, hevyTemplatesFor } from './hevy.use-cases';
import { SyncGarminUseCase, type GarminSyncResult } from './garmin.use-cases';

export interface Routine extends Omit<
  RoutineView,
  'hevySentAt' | 'lastDoneAt'
> {
  hevySentAt: string | null;
  lastDoneAt: string | null;
  muscles: MuscleShare[];
}

const toRoutine = (v: RoutineView): Routine => ({
  ...v,
  hevySentAt: v.hevySentAt?.toISOString() ?? null,
  lastDoneAt: v.lastDoneAt?.toISOString() ?? null,
  muscles: routineMuscles(v.exercises),
});

@Injectable()
export class ListRoutinesUseCase {
  constructor(
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly repo: BrioRoutineRepositoryPort,
  ) {}

  async execute(userId: string): Promise<Routine[]> {
    return (await this.repo.list(userId)).map(toRoutine);
  }
}

@Injectable()
export class GetRoutineUseCase {
  constructor(
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly repo: BrioRoutineRepositoryPort,
  ) {}

  async execute(userId: string, id: string): Promise<Routine> {
    const r = await this.repo.get(userId, id);
    if (!r) throw new NotFoundException('BRIO_ROUTINE_NOT_FOUND');
    return toRoutine(r);
  }
}

/** Crear (sin id) o sustituir (con id) una rutina. */
@Injectable()
export class SaveRoutineUseCase {
  constructor(
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly repo: BrioRoutineRepositoryPort,
  ) {}

  async execute(
    userId: string,
    input: RoutineInput,
    id?: string,
  ): Promise<Routine> {
    let data;
    try {
      data = cleanRoutine(input);
    } catch (e) {
      if (e instanceof InvalidRoutineError)
        throw new BadRequestException(e.code);
      throw e;
    }
    const missing = await this.repo.missingExercises(
      userId,
      data.exercises.map((e) => e.exerciseId),
    );
    if (missing.length) throw new NotFoundException('BRIO_EXERCISE_NOT_FOUND');

    let routineId = id;
    if (routineId) {
      if (!(await this.repo.update(userId, routineId, data)))
        throw new NotFoundException('BRIO_ROUTINE_NOT_FOUND');
    } else {
      routineId = await this.repo.create(userId, data);
    }
    return toRoutine((await this.repo.get(userId, routineId))!);
  }
}

@Injectable()
export class ArchiveRoutineUseCase {
  constructor(
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly repo: BrioRoutineRepositoryPort,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    if (!(await this.repo.archive(userId, id)))
      throw new NotFoundException('BRIO_ROUTINE_NOT_FOUND');
  }
}

/** Enlaza un entreno apuntado en Brío con la rutina que se eligió al apuntarlo. */
@Injectable()
export class LinkSessionToRoutineUseCase {
  constructor(
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly repo: BrioRoutineRepositoryPort,
  ) {}

  async execute(userId: string, sessionId: string, routineId: string) {
    if (!(await this.repo.linkSession(userId, sessionId, routineId)))
      throw new NotFoundException('BRIO_ROUTINE_NOT_FOUND');
  }
}

export interface RoutineSentToHevy {
  hevyRoutineId: string | null;
  /** true si se actualizó la que ya estaba en Hevy; false si se creó. */
  updated: boolean;
  exercises: number;
  /** Ejercicios sin equivalente en Hevy, que se han quedado fuera. */
  skipped: string[];
}

/**
 * Lleva la rutina de gimnasio a Hevy: la crea la primera vez y la actualiza
 * las siguientes (si se borró en Hevy, se vuelve a crear). Al terminar el
 * entreno en Hevy, la sincronización lo trae y lo enlaza con esta rutina.
 */
@Injectable()
export class SendRoutineToHevyUseCase {
  constructor(
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly routines: BrioRoutineRepositoryPort,
    @Inject(BRIO_HEVY_REPOSITORY)
    private readonly hevy: BrioHevyRepositoryPort,
    @Inject(HEVY_CLIENT) private readonly client: HevyClientPort,
    @Inject(BRIO_SECRET_CIPHER) private readonly cipher: SecretCipher,
  ) {}

  async execute(userId: string, id: string): Promise<RoutineSentToHevy> {
    const routine = await this.routines.get(userId, id);
    if (!routine) throw new NotFoundException('BRIO_ROUTINE_NOT_FOUND');
    if (routine.kind !== 'STRENGTH')
      throw new BadRequestException('BRIO_HEVY_NOT_STRENGTH');
    const conn = await this.hevy.getConnection(userId);
    if (!conn) throw new NotFoundException('BRIO_HEVY_NOT_CONNECTED');

    const apiKey = this.cipher.decrypt(conn.apiKeyEnc);
    try {
      const templateOf = await hevyTemplatesFor(
        this.hevy,
        this.client,
        userId,
        apiKey,
        routine.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          exerciseCode: e.code,
        })),
      );
      const { exercises, skipped } = hevyRoutineFrom(routine.exercises, (x) =>
        templateOf.get(x),
      );
      if (!exercises.length)
        throw new BadRequestException('BRIO_HEVY_NO_MATCHING_EXERCISES');
      const body = {
        title: routine.name,
        notes: routine.notes ?? 'Rutina de Brío',
        exercises,
      };

      if (routine.hevyRoutineId) {
        try {
          await this.client.updateRoutine(apiKey, routine.hevyRoutineId, body);
          await this.routines.setHevyRoutine(id, routine.hevyRoutineId);
          return {
            hevyRoutineId: routine.hevyRoutineId,
            updated: true,
            exercises: exercises.length,
            skipped,
          };
        } catch (e) {
          // Borrada en Hevy: se crea otra abajo.
          if (!(e instanceof HevyApiError && e.status === 404)) throw e;
        }
      }
      const created = await this.client.createRoutine(apiKey, body);
      await this.routines.setHevyRoutine(id, created.id);
      return {
        hevyRoutineId: created.id,
        updated: false,
        exercises: exercises.length,
        skipped,
      };
    } catch (e) {
      throw hevyHttpError(e);
    }
  }
}

/** Ventana en la que se busca el entreno de Garmin recién hecho. */
const GARMIN_LINK_WINDOW_MS = 18 * 3600 * 1000;

export interface RoutineGarminSync {
  sync: GarminSyncResult;
  /** Entreno de Garmin que se ha enlazado con la rutina, si había uno. */
  linkedSessionId: string | null;
}

/**
 * Tras hacer una rutina de cardio con el reloj: trae lo nuevo de Garmin y
 * enlaza con la rutina el entreno más reciente de esa disciplina.
 */
@Injectable()
export class SyncRoutineWithGarminUseCase {
  constructor(
    @Inject(BRIO_ROUTINE_REPOSITORY)
    private readonly routines: BrioRoutineRepositoryPort,
    private readonly garmin: SyncGarminUseCase,
  ) {}

  async execute(
    userId: string,
    id: string,
    now = new Date(),
  ): Promise<RoutineGarminSync> {
    const routine = await this.routines.get(userId, id);
    if (!routine) throw new NotFoundException('BRIO_ROUTINE_NOT_FOUND');
    if (routine.kind === 'STRENGTH')
      throw new BadRequestException('BRIO_ROUTINE_NOT_CARDIO');

    const sync = await this.garmin.execute(userId, now);
    const candidates = await this.routines.unlinkedGarminSessions(
      userId,
      new Date(now.getTime() - GARMIN_LINK_WINDOW_MS),
    );
    const match = candidates.find((s) => kindMatches(routine.kind, s.kind));
    if (match) await this.routines.linkSession(userId, match.id, routine.id);
    return { sync, linkedSessionId: match?.id ?? null };
  }
}
