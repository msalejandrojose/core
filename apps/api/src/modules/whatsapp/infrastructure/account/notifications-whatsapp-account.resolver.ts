import { Inject, Injectable } from '@nestjs/common';
import { channelDefinition } from '../../../notifications/domain/channels/channel-catalog';
import { decryptConfigSecrets } from '../../../notifications/application/config-secrets';
import {
  SENDING_ACCOUNT_REPOSITORY,
  type SendingAccountRepositoryPort,
} from '../../../notifications/application/ports/sending-account-repository.port';
import {
  SECRET_CIPHER,
  type SecretCipherPort,
} from '../../../notifications/application/ports/secret-cipher.port';
import type { SendingAccount } from '../../../notifications/domain/entities/sending-account.entity';
import type {
  ResolvedWhatsappAccount,
  WhatsappAccountResolverPort,
  WhatsappAccountSummary,
} from '../../application/ports/whatsapp-account-resolver.port';

// Número máximo de cuentas WHATSAPP que consideramos (no habrá muchas). Se
// listan y filtran en memoria en vez de añadir un query específico al repo de
// notificaciones, para no ampliar su superficie por un caso de este módulo.
const MAX_ACCOUNTS = 100;

@Injectable()
export class NotificationsWhatsappAccountResolver
  implements WhatsappAccountResolverPort
{
  constructor(
    @Inject(SENDING_ACCOUNT_REPOSITORY)
    private readonly accounts: SendingAccountRepositoryPort,
    @Inject(SECRET_CIPHER)
    private readonly cipher: SecretCipherPort,
  ) {}

  async resolveByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<ResolvedWhatsappAccount | null> {
    const accounts = await this.whatsappAccounts();
    const match = accounts.find(
      (a) => this.phoneNumberIdOf(a) === phoneNumberId,
    );
    return match ? this.toResolved(match) : null;
  }

  async getById(accountId: string): Promise<ResolvedWhatsappAccount | null> {
    const account = await this.accounts.findById(accountId);
    if (!account || account.type?.channel !== 'WHATSAPP') return null;
    return this.toResolved(account);
  }

  async listAccounts(): Promise<WhatsappAccountSummary[]> {
    const accounts = await this.whatsappAccounts();
    return accounts.map((a) => ({
      id: a.id,
      name: a.name,
      phoneNumberId: this.phoneNumberIdOf(a),
    }));
  }

  private async whatsappAccounts(): Promise<SendingAccount[]> {
    const page = await this.accounts.list({ limit: MAX_ACCOUNTS });
    return page.items.filter((a) => a.type?.channel === 'WHATSAPP');
  }

  private phoneNumberIdOf(account: SendingAccount): string | null {
    const value = account.config.phoneNumberId;
    return typeof value === 'string' && value !== '' ? value : null;
  }

  // Descifra los secretos de la config (accessToken) para poder despachar.
  private toResolved(account: SendingAccount): ResolvedWhatsappAccount {
    const config = decryptConfigSecrets(
      account.config,
      channelDefinition('WHATSAPP').config,
      this.cipher,
    );
    return { id: account.id, name: account.name, config };
  }
}
