import type { MessageType } from '../../domain/entities/message-type.entity';
import {
  toSendingAccountDomain,
  type SendingAccountRow,
} from './sending-account.mapper';

export interface MessageTypeRow {
  id: string;
  key: string;
  name: string;
  accountId: string;
  content: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  account?: SendingAccountRow | null;
}

export function toMessageTypeDomain(row: MessageTypeRow): MessageType {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    accountId: row.accountId,
    content: (row.content ?? {}) as Record<string, unknown>,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    account: row.account ? toSendingAccountDomain(row.account) : undefined,
  };
}
