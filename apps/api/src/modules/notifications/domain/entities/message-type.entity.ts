import type { SendingAccount } from './sending-account.entity';

export interface MessageType {
  id: string;
  key: string;
  name: string;
  accountId: string;
  /** Campos del canal (subject/html, body, title/body…). Admite `{{ var }}`. */
  content: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** La cuenta (con su tipo) se incluye cuando el repositorio la carga. */
  account?: SendingAccount;
}
