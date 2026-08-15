// El código corto y permanente de un jugador (TASK-222). Se genera perezoso
// la primera vez que se pide, no al crear la cuenta.
export class FriendCode {
  constructor(
    readonly userId: string,
    readonly code: string,
    readonly createdAt: Date,
  ) {}
}
