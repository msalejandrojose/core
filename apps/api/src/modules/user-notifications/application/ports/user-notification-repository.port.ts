import { CursorPage } from '../../../../shared/pagination';
import { UserNotification } from '../../domain/entities/user-notification.entity';

export const USER_NOTIFICATION_REPOSITORY = Symbol(
  'USER_NOTIFICATIONS_REPOSITORY',
);

export interface CreateUserNotificationData {
  userId: string;
  kind: string;
  title: string;
  body: string | null;
  data: unknown;
}

export interface ListUserNotificationsOptions {
  userId: string;
  limit: number;
  cursor?: string;
  /** Si es `true`, solo devuelve las no leídas (`readAt === null`). */
  unreadOnly?: boolean;
}

export interface UserNotificationRepositoryPort {
  create(data: CreateUserNotificationData): Promise<UserNotification>;
  list(
    opts: ListUserNotificationsOptions,
  ): Promise<CursorPage<UserNotification>>;
  countUnread(userId: string): Promise<number>;
  /**
   * Marca como leída una notificación del usuario. Devuelve la notificación
   * actualizada, o `null` si no existe o no pertenece al usuario.
   */
  markRead(id: string, userId: string): Promise<UserNotification | null>;
  /** Marca todas las no leídas del usuario. Devuelve cuántas se actualizaron. */
  markAllRead(userId: string): Promise<number>;
}
