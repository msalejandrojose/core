import {
  RacingCircuitRotationConfig,
  RacingCircuitRotationConfigKey,
} from '../../domain/entities/racing-circuit-rotation-config.entity';

export const RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY = Symbol(
  'RACING_CIRCUIT_ROTATION_CONFIG_REPOSITORY',
);

// Sin create/delete: la única clave es un conjunto cerrado (ver el
// comentario del modelo en schema.prisma) — solo se lista y se ajusta su
// valor, mismo criterio que `RacingLeagueConfigRepositoryPort`.
export interface RacingCircuitRotationConfigRepositoryPort {
  findAll(): Promise<RacingCircuitRotationConfig[]>;
  findByKey(
    key: RacingCircuitRotationConfigKey,
  ): Promise<RacingCircuitRotationConfig | null>;
  update(
    key: RacingCircuitRotationConfigKey,
    value: number,
  ): Promise<RacingCircuitRotationConfig>;
  /** Todos los valores de una vez como Map — evita una query por clave
   *  dentro del mismo cálculo (hoy solo una, mismo patrón que
   *  `RacingLeagueConfigRepositoryPort.getAmounts()`). */
  getValues(): Promise<ReadonlyMap<RacingCircuitRotationConfigKey, number>>;
}
