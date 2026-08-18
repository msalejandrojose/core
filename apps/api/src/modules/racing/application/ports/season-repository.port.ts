import { Season } from '../../domain/entities/season.entity';

export const SEASON_REPOSITORY = Symbol('RACING_SEASON_REPOSITORY');

export interface CreateSeasonData {
  name: string;
  startsAt: Date;
}

export interface SeasonRepositoryPort {
  create(data: CreateSeasonData): Promise<Season>;

  findById(id: string): Promise<Season | null>;

  /** La temporada abierta (`endsAt` null), o null si no hay ninguna — el
   *  feature puede estar todavía sin configurar. Como mucho una fila puede
   *  estar abierta a la vez (lo garantiza `AdminCreateSeasonUseCase`), así
   *  que no hace falta desempatar. */
  findCurrent(): Promise<Season | null>;

  /** Todas, más reciente primero. */
  list(): Promise<Season[]>;

  /** Cierra una temporada en el instante dado — lo usa
   *  `AdminCreateSeasonUseCase` para cerrar la anterior al abrir la
   *  siguiente, nunca se expone suelto como "cerrar" porque una temporada
   *  cerrada sin otra abierta detrás dejaría el juego sin clasificación
   *  actual. */
  close(id: string, endsAt: Date): Promise<void>;
}
