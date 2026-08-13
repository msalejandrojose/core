// Sesión de login con Google iniciada desde un cliente sin SDK nativo (Godot,
// TASK-216): la app abre `authUrl` en el navegador del sistema y hace polling
// de esta entidad hasta que deja de estar PENDING.
export type GoogleAuthSessionStatus = 'PENDING' | 'READY' | 'FAILED';

export class GoogleAuthSession {
  constructor(
    readonly id: string,
    readonly state: string,
    readonly status: GoogleAuthSessionStatus,
    readonly accessToken: string | null,
    readonly userId: string | null,
    readonly failureReason: string | null,
    readonly expiresAt: Date,
  ) {}

  isExpired(now: Date): boolean {
    return now.getTime() > this.expiresAt.getTime();
  }
}
