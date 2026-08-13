// Perfil de partida de un arquetipo de coche (TASK-262): normal/F1/4x4, sobre
// los mismos ejes que ya usa `Vehicle` en el cliente.
export class CarArchetype {
  constructor(
    readonly id: string,
    // Identificador estable, independiente del nombre visible.
    readonly code: string,
    readonly name: string,
    readonly speedScale: number,
    // Agarre en asfalto seco.
    readonly grip: number,
    // Multiplica el grip efectivo cuando la superficie NO es asfalto seco
    // (tema SNOW, o celda con terreno de sección pintado) — decisión de
    // TASK-264. En asfalto seco no se aplica.
    readonly offroadGripModifier: number,
    readonly isActive: boolean,
  ) {}
}
