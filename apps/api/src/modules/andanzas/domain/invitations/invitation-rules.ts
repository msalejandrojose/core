import { Invitation } from '../entities/invitation.entity';

// Caducidad por defecto de un código si no se especifica otra al crearlo.
export const DEFAULT_INVITATION_TTL_DAYS = 14;

// Cuántas invitaciones activas (sin usar y sin caducar) puede tener a la vez
// un mismo usuario. Límite simple para frenar spam en la beta cerrada, no
// una medida antiabuso sofisticada.
export const MAX_ACTIVE_INVITATIONS_PER_USER = 5;

export function computeExpiresAt(
  createdAt: Date,
  ttlDays: number = DEFAULT_INVITATION_TTL_DAYS,
): Date {
  return new Date(createdAt.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

// Un código es válido para canjear si nadie lo ha usado todavía y, si tiene
// fecha de caducidad, esa fecha no ha pasado.
export function isInvitationValid(invitation: Invitation, now: Date): boolean {
  if (invitation.usedByUserId !== null) return false;
  if (invitation.expiresAt !== null && invitation.expiresAt <= now) return false;
  return true;
}

export function canCreateInvitation(
  activeInvitationCount: number,
  max: number = MAX_ACTIVE_INVITATIONS_PER_USER,
): boolean {
  return activeInvitationCount < max;
}
