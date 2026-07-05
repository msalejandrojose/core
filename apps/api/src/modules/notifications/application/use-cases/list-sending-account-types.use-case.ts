import { Inject, Injectable } from '@nestjs/common';
import type { SendingAccountType } from '../../domain/entities/sending-account-type.entity';
import {
  SENDING_ACCOUNT_TYPE_REPOSITORY,
  type SendingAccountTypeRepositoryPort,
} from '../ports/sending-account-type-repository.port';

@Injectable()
export class ListSendingAccountTypesUseCase {
  constructor(
    @Inject(SENDING_ACCOUNT_TYPE_REPOSITORY)
    private readonly types: SendingAccountTypeRepositoryPort,
  ) {}

  execute(): Promise<SendingAccountType[]> {
    return this.types.list();
  }
}
