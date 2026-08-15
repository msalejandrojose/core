export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

// Una solicitud de amistad (TASK-222): recíproca, con aceptación — no basta
// con introducir el código de alguien, hace falta que la otra persona
// acepte. Una fila por solicitud, no por pareja: tras un rechazo se puede
// volver a pedir, y eso es una fila nueva que no borra el historial.
export class Friendship {
  constructor(
    readonly id: string,
    readonly requesterId: string,
    readonly addresseeId: string,
    readonly status: FriendshipStatus,
    readonly createdAt: Date,
    readonly respondedAt: Date | null,
  ) {}
}

// Proyección de una amistad ya aceptada, con el nombre del OTRO jugador ya
// resuelto — para "ver tu lista de amigos" (TASK-258).
export class Friend {
  constructor(
    readonly userId: string,
    readonly displayName: string,
    readonly friendsSince: Date,
  ) {}
}

// Proyección de una solicitud PENDING recibida, con el nombre de quien la
// mandó ya resuelto.
export class FriendshipRequest {
  constructor(
    readonly id: string,
    readonly requesterId: string,
    readonly requesterDisplayName: string,
    readonly createdAt: Date,
  ) {}
}
