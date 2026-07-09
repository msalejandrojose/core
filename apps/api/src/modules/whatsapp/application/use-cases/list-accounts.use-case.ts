import { Inject, Injectable } from '@nestjs/common';
import {
  WHATSAPP_ACCOUNT_RESOLVER,
  type WhatsappAccountResolverPort,
  type WhatsappAccountSummary,
} from '../ports/whatsapp-account-resolver.port';

@Injectable()
export class ListWhatsappAccountsUseCase {
  constructor(
    @Inject(WHATSAPP_ACCOUNT_RESOLVER)
    private readonly accounts: WhatsappAccountResolverPort,
  ) {}

  execute(): Promise<WhatsappAccountSummary[]> {
    return this.accounts.listAccounts();
  }
}
