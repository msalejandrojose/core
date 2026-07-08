// Notificación in-app de un usuario (una fila del inbox). Entidad de dominio
// pura: sin Nest, sin Prisma. `readAt === null` ⇒ no leída.
export interface UserNotification {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string | null;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}
