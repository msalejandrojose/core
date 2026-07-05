import { Inject, Injectable } from '@nestjs/common';
import { channelDefinition } from '../../domain/channels/channel-catalog';
import { validateFields } from '../../domain/channels/validate-fields';
import type { SendingAccount } from '../../domain/entities/sending-account.entity';
import { InvalidAccountConfigError } from '../../domain/errors/invalid-account-config.error';
import { SendingAccountTypeNotFoundError } from '../../domain/errors/sending-account-type-not-found.error';
import { encryptConfigSecrets } from '../config-secrets';
import {
  SENDING_ACCOUNT_REPOSITORY,
  type SendingAccountRepositoryPort,
} from '../ports/sending-account-repository.port';
import {
  SENDING_ACCOUNT_TYPE_REPOSITORY,
  type SendingAccountTypeRepositoryPort,
} from '../ports/sending-account-type-repository.port';
import {
  SECRET_CIPHER,
  type SecretCipherPort,
} from '../ports/secret-cipher.port';

export interface CreateSendingAccountInput {
  typeId: string;
  name: string;
  config: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
}

@Injectable()
export class CreateSendingAccountUseCase {
  constructor(
    @Inject(SENDING_ACCOUNT_REPOSITORY)
    private readonly accounts: SendingAccountRepositoryPort,
    @Inject(SENDING_ACCOUNT_TYPE_REPOSITORY)
    private readonly types: SendingAccountTypeRepositoryPort,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
  ) {}

  async execute(input: CreateSendingAccountInput): Promise<SendingAccount> {
    const type = await this.types.findById(input.typeId);
    if (!type) throw new SendingAccountTypeNotFoundError(input.typeId);

    const fields = channelDefinition(type.channel).config;
    const error = validateFields(fields, input.config);
    if (error) throw new InvalidAccountConfigError(error);

    const config = encryptConfigSecrets(input.config, fields, this.cipher);
    const isDefault = input.isDefault ?? false;

    const account = await this.accounts.create({
      typeId: type.id,
      name: input.name.trim(),
      config,
      isActive: input.isActive ?? true,
      isDefault,
    });

    if (isDefault) {
      await this.accounts.clearDefaultForType(type.id, account.id);
    }

    return { ...account, type };
  }
}
