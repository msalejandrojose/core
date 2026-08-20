// Qué parámetro del matchmaking de la fase online real se está editando
// (TASK-323, tarea 8) — antes constantes en código.
export enum RacingMatchmakingConfigKey {
  RATING_K_FACTOR = 'RATING_K_FACTOR',
  RATING_WINDOW_BASE_POINTS = 'RATING_WINDOW_BASE_POINTS',
  BOT_FILL_TIMEOUT_MS = 'BOT_FILL_TIMEOUT_MS',
}

// Fila editable desde el backoffice para uno de los parámetros del
// matchmaking (TASK-323, tarea 8).
export class RacingMatchmakingConfig {
  constructor(
    readonly key: RacingMatchmakingConfigKey,
    readonly value: number,
  ) {}
}
