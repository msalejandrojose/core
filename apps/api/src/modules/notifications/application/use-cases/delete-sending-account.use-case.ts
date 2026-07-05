import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { SendingAccountNotFoundError } from '../../domain/errors/sending-account-not-found.error';
import {
  SENDING_ACCOUNT_REPOSITORY,
  type SendingAccountRepositoryPort,
} from '../ports/sending-account-repository.port';

@Injectable()
export class DeleteSendingAccountUseCase {
  constructor(
    @Inject(SENDING_ACCOUNT_REPOSITORY)
    private readonly accounts: SendingAccountRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.accounts.findById(id);
    if (!existing) throw new SendingAccountNotFoundError(id);

    const used = await this.accounts.countMessageTypes(id);
    if (used > 0) {
      throw new ConflictException(
        `No se puede borrar: la cuenta tiene ${used} tipo(s) de mensaje asociados.`,
      );
    }

    await this.accounts.delete(id);
  }
}
