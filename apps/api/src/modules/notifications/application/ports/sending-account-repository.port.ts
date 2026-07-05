import type { CursorPage } from '../../../../shared/pagination';
import type { SendingAccount } from '../../domain/entities/sending-account.entity';

export const SENDING_ACCOUNT_REPOSITORY = Symbol(
  'NOTIFICATIONS_SENDING_ACCOUNT_REPOSITORY',
);

export interface CreateSendingAccountData {
  typeId: string;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  isDefault: boolean;
}

export interface UpdateSendingAccountData {
  name?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface ListSendingAccountsOptions {
  limit: number;
  cursor?: string;
  typeId?: string;
  isActive?: boolean;
}

export interface SendingAccountRepositoryPort {
  create(data: CreateSendingAccountData): Promise<SendingAccount>;
  update(id: string, data: UpdateSendingAccountData): Promise<SendingAccount>;
  /** Incluye el `type` para poder derivar el canal. */
  findById(id: string): Promise<SendingAccount | null>;
  list(opts: ListSendingAccountsOptions): Promise<CursorPage<SendingAccount>>;
  delete(id: string): Promise<void>;
  /** Cuántos tipos de mensaje cuelgan de esta cuenta (para bloquear el borrado). */
  countMessageTypes(accountId: string): Promise<number>;
  /** Quita el flag `isDefault` del resto de cuentas del mismo tipo. */
  clearDefaultForType(typeId: string, exceptId?: string): Promise<void>;
}
