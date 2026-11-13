import { Inject, Injectable } from '@nestjs/common';
import type { DailyLog } from '../../domain/entities/daily-log.entity';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';
import {
  BRIO_BODY_REPOSITORY,
  type BrioBodyRepositoryPort,
} from '../ports/brio-body-repository.port';
import {
  BRIO_DIARY_REPOSITORY,
  type BrioDiaryRepositoryPort,
} from '../ports/brio-diary-repository.port';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';

/**
 * Recalcula el agregado de un día a partir de sus comidas y sesiones. Lo
 * invocan todas las escrituras del diario (comida, actividad, pesada) para que
 * `brio_daily_log` nunca quede desincronizado de sus partes.
 *
 * Se recalcula el día completo en vez de sumar deltas: es una sola query de
 * agregación por tabla, y un delta mal aplicado dejaría el total mintiendo para
 * siempre.
 */
@Injectable()
export class RefreshDailyLogUseCase {
  constructor(
    @Inject(BRIO_DIARY_REPOSITORY)
    private readonly diary: BrioDiaryRepositoryPort,
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
  ) {}

  async execute(userId: string, day: string): Promise<DailyLog> {
    const [intake, kcalBurned, profile, measurements] = await Promise.all([
      this.diary.sumIntakeByDay(userId, day),
      this.activity.sumKcalByDay(userId, day),
      this.profiles.findByUserId(userId),
      this.body.listBetween(userId, day, day),
    ]);

    return this.diary.upsertDailyLog(userId, day, {
      kcalIn: intake.kcal,
      kcalBurned,
      // Snapshot del objetivo vigente: si mañana cambia, el día de hoy
      // conserva con qué objetivo se vivió.
      kcalTarget: profile?.dailyKcalTarget ?? null,
      proteinG: intake.proteinG,
      carbsG: intake.carbsG,
      fatG: intake.fatG,
      weightKg: measurements[0]?.weightKg ?? null,
    });
  }
}
