import type { NotificationChannel } from '@core/shared-types';
import type { SendingAccountType } from '../../domain/entities/sending-account-type.entity';
import type { FieldDescriptor } from '../../domain/channels/field-descriptor';

export const SENDING_ACCOUNT_TYPE_REPOSITORY = Symbol(
  'NOTIFICATIONS_SENDING_ACCOUNT_TYPE_REPOSITORY',
);

export interface CreateSendingAccountTypeData {
  key: string;
  name: string;
  channel: NotificationChannel;
  configSchema: FieldDescriptor[];
  messageSchema: FieldDescriptor[];
  isActive: boolean;
}

export interface SendingAccountTypeRepositoryPort {
  create(data: CreateSendingAccountTypeData): Promise<SendingAccountType>;
  list(): Promise<SendingAccountType[]>;
  findById(id: string): Promise<SendingAccountType | null>;
  findByKey(key: string): Promise<SendingAccountType | null>;
}
