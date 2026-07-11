// Código de invitación para el arranque en beta cerrada. usedByUserId null
// significa que todavía no se ha canjeado.
export interface Invitation {
  id: string;
  code: string;
  createdByUserId: string;
  usedByUserId: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}
