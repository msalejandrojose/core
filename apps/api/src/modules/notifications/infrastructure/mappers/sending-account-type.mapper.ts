import type { NotificationChannel } from '@core/shared-types';
import type { FieldDescriptor } from '../../domain/channels/field-descriptor';
import type { SendingAccountType } from '../../domain/entities/sending-account-type.entity';

export interface SendingAccountTypeRow {
  id: string;
  key: string;
  name: string;
  channel: string;
  configSchema: unknown;
  messageSchema: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toSendingAccountTypeDomain(
  row: SendingAccountTypeRow,
): SendingAccountType {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    channel: row.channel as NotificationChannel,
    configSchema: (row.configSchema ?? []) as FieldDescriptor[],
    messageSchema: (row.messageSchema ?? []) as FieldDescriptor[],
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
