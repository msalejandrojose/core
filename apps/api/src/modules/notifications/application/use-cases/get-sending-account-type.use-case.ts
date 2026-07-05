import { Inject, Injectable } from '@nestjs/common';
import type { SendingAccountType } from '../../domain/entities/sending-account-type.entity';
import { SendingAccountTypeNotFoundError } from '../../domain/errors/sending-account-type-not-found.error';
import {
  SENDING_ACCOUNT_TYPE_REPOSITORY,
  type SendingAccountTypeRepositoryPort,
} from '../ports/sending-account-type-repository.port';

@Injectable()
export class GetSendingAccountTypeUseCase {
  constructor(
    @Inject(SENDING_ACCOUNT_TYPE_REPOSITORY)
    private readonly types: SendingAccountTypeRepositoryPort,
  ) {}

  async execute(id: string): Promise<SendingAccountType> {
    const type = await this.types.findById(id);
    if (!type) throw new SendingAccountTypeNotFoundError(id);
    return type;
  }
}
