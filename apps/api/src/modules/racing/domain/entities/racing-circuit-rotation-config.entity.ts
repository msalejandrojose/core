// Parámetro editable de la rotación diaria de circuitos (TASK-336) — hoy
// solo una clave, pero se deja como conjunto (mismo criterio que
// `RacingLeagueConfigKey`) por si mañana hace falta un segundo parámetro
// (p.ej. cada cuántos días rota) sin cambiar de forma.
export enum RacingCircuitRotationConfigKey {
  CIRCUITS_PER_DAY = 'CIRCUITS_PER_DAY',
}

// Fila editable desde el backoffice para uno de los parámetros de rotación.
export class RacingCircuitRotationConfig {
  constructor(
    readonly key: RacingCircuitRotationConfigKey,
    readonly value: number,
  ) {}
}
