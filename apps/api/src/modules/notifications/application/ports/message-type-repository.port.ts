import type { CursorPage } from '../../../../shared/pagination';
import type { MessageType } from '../../domain/entities/message-type.entity';

export const MESSAGE_TYPE_REPOSITORY = Symbol(
  'NOTIFICATIONS_MESSAGE_TYPE_REPOSITORY',
);

export interface CreateMessageTypeData {
  key: string;
  name: string;
  accountId: string;
  content: Record<string, unknown>;
  isActive: boolean;
}

export interface UpdateMessageTypeData {
  name?: string;
  accountId?: string;
  content?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ListMessageTypesOptions {
  limit: number;
  cursor?: string;
  accountId?: string;
  isActive?: boolean;
}

export interface MessageTypeRepositoryPort {
  create(data: CreateMessageTypeData): Promise<MessageType>;
  update(id: string, data: UpdateMessageTypeData): Promise<MessageType>;
  /** Incluye `account` y su `type` (para derivar el canal en el envío). */
  findById(id: string): Promise<MessageType | null>;
  /** Incluye `account` y su `type`. */
  findByKey(key: string): Promise<MessageType | null>;
  list(opts: ListMessageTypesOptions): Promise<CursorPage<MessageType>>;
  delete(id: string): Promise<void>;
}
