// Hueco de equipamiento: como mucho una pieza de cada categoría a la vez
// (TASK-263) — no tiene sentido llevar dos juegos de neumáticos montados.
export enum CarPartCategory {
  TIRES = 'TIRES',
  WING = 'WING',
  CHASSIS = 'CHASSIS',
}

// Pieza montable, independiente del arquetipo (TASK-263): la misma pieza vale
// para cualquier arquetipo. `speedScale`/`grip` son DELTAS que se suman al
// perfil base del arquetipo equipado, no valores absolutos — ver
// `computeCarStats`.
export class CarPart {
  constructor(
    readonly id: string,
    readonly code: string,
    readonly category: CarPartCategory,
    readonly name: string,
    readonly speedScale: number,
    readonly grip: number,
    // Mismo campo y mismo criterio que `CarSkin.isUnlockedByDefault`: true =
    // todos la tienen sin necesidad de fila en `PlayerCarPart`.
    readonly isUnlockedByDefault: boolean,
    // Precio en la tienda (TASK-320) — null si no está a la venta.
    readonly priceCoins: number | null,
    readonly isActive: boolean,
  ) {}
}
