import { UserNotification } from '../../domain/entities/user-notification.entity';

export interface UserNotificationRow {
  id: string;
  userId: string;
  kind: string;
  title: string;
  body: string | null;
  data: unknown;
  readAt: Date | null;
  createdAt: Date;
}

export function toUserNotificationDomain(
  row: UserNotificationRow,
): UserNotification {
  return {
    id: row.id,
    userId: row.userId,
    kind: row.kind,
    title: row.title,
    body: row.body,
    data: row.data ?? null,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}
