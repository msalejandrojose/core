import { Inject, Injectable } from '@nestjs/common';
import type { SendingAccount } from '../../domain/entities/sending-account.entity';
import { SendingAccountNotFoundError } from '../../domain/errors/sending-account-not-found.error';
import {
  SENDING_ACCOUNT_REPOSITORY,
  type SendingAccountRepositoryPort,
} from '../ports/sending-account-repository.port';

@Injectable()
export class GetSendingAccountUseCase {
  constructor(
    @Inject(SENDING_ACCOUNT_REPOSITORY)
    private readonly accounts: SendingAccountRepositoryPort,
  ) {}

  async execute(id: string): Promise<SendingAccount> {
    const account = await this.accounts.findById(id);
    if (!account) throw new SendingAccountNotFoundError(id);
    return account;
  }
}
