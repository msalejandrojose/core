// Relación de seguimiento direccional tipo Instagram (no requiere aceptación
// mutua). followerId sigue a followingId.
export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: Date;
}
