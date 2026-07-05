import { Inject, Injectable } from '@nestjs/common';
import type { CursorPage } from '../../../../shared/pagination';
import type { SendingAccount } from '../../domain/entities/sending-account.entity';
import {
  SENDING_ACCOUNT_REPOSITORY,
  type ListSendingAccountsOptions,
  type SendingAccountRepositoryPort,
} from '../ports/sending-account-repository.port';

@Injectable()
export class ListSendingAccountsUseCase {
  constructor(
    @Inject(SENDING_ACCOUNT_REPOSITORY)
    private readonly accounts: SendingAccountRepositoryPort,
  ) {}

  execute(
    opts: ListSendingAccountsOptions,
  ): Promise<CursorPage<SendingAccount>> {
    return this.accounts.list(opts);
  }
}
