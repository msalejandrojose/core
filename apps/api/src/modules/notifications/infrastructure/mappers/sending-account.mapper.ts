import type { SendingAccount } from '../../domain/entities/sending-account.entity';
import {
  toSendingAccountTypeDomain,
  type SendingAccountTypeRow,
} from './sending-account-type.mapper';

export interface SendingAccountRow {
  id: string;
  typeId: string;
  name: string;
  config: unknown;
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  type?: SendingAccountTypeRow | null;
}

export function toSendingAccountDomain(row: SendingAccountRow): SendingAccount {
  return {
    id: row.id,
    typeId: row.typeId,
    name: row.name,
    config: (row.config ?? {}) as Record<string, unknown>,
    isActive: row.isActive,
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    type: row.type ? toSendingAccountTypeDomain(row.type) : undefined,
  };
}
