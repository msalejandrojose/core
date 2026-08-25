// Configuración de coche que un jugador tiene puesta AHORA MISMO. Una fila
// por jugador (no por circuito ni por intento): es una preferencia global,
// igual que la cilindrada o el sentido en `GameSettings` del cliente.
export class PlayerCarLoadout {
  constructor(
    readonly userId: string,
    readonly archetypeId: string,
    readonly tiresPartId: string | null,
    readonly wingPartId: string | null,
    readonly chassisPartId: string | null,
    readonly skinId: string | null,
  ) {}
}
