import type { NotificationChannel } from '@core/shared-types';
import type { FieldDescriptor } from '../channels/field-descriptor';

export interface SendingAccountType {
  id: string;
  key: string;
  name: string;
  channel: NotificationChannel;
  configSchema: FieldDescriptor[];
  messageSchema: FieldDescriptor[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
