import { Inject, Injectable } from '@nestjs/common';
import {
  channelDefinition,
  secretFieldKeys,
} from '../../domain/channels/channel-catalog';
import { validateFields } from '../../domain/channels/validate-fields';
import type { SendingAccount } from '../../domain/entities/sending-account.entity';
import { InvalidAccountConfigError } from '../../domain/errors/invalid-account-config.error';
import { SendingAccountNotFoundError } from '../../domain/errors/sending-account-not-found.error';
import { encryptConfigSecrets, MASK } from '../config-secrets';
import {
  SENDING_ACCOUNT_REPOSITORY,
  type SendingAccountRepositoryPort,
  type UpdateSendingAccountData,
} from '../ports/sending-account-repository.port';
import {
  SECRET_CIPHER,
  type SecretCipherPort,
} from '../ports/secret-cipher.port';

export interface UpdateSendingAccountInput {
  name?: string;
  config?: Record<string, unknown>;
  isActive?: boolean;
  isDefault?: boolean;
}

@Injectable()
export class UpdateSendingAccountUseCase {
  constructor(
    @Inject(SENDING_ACCOUNT_REPOSITORY)
    private readonly accounts: SendingAccountRepositoryPort,
    @Inject(SECRET_CIPHER) private readonly cipher: SecretCipherPort,
  ) {}

  async execute(
    id: string,
    input: UpdateSendingAccountInput,
  ): Promise<SendingAccount> {
    const existing = await this.accounts.findById(id);
    if (!existing || !existing.type) throw new SendingAccountNotFoundError(id);

    const fields = channelDefinition(existing.type.channel).config;
    const data: UpdateSendingAccountData = {};

    if (input.name !== undefined) data.name = input.name.trim();
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.isDefault !== undefined) data.isDefault = input.isDefault;

    if (input.config !== undefined) {
      // Merge sobre la config existente (semántica PATCH). Un secreto que llega
      // enmascarado o vacío se interpreta como "no lo toques": se conserva el
      // valor cifrado ya almacenado.
      const secrets = new Set(secretFieldKeys(fields));
      const effective: Record<string, unknown> = { ...existing.config };
      for (const [key, value] of Object.entries(input.config)) {
        if (
          secrets.has(key) &&
          (value === MASK || value === '' || value == null)
        ) {
          continue;
        }
        effective[key] = value;
      }

      const error = validateFields(fields, effective);
      if (error) throw new InvalidAccountConfigError(error);

      data.config = encryptConfigSecrets(effective, fields, this.cipher);
    }

    const updated = await this.accounts.update(id, data);

    if (input.isDefault === true) {
      await this.accounts.clearDefaultForType(existing.type.id, id);
    }

    return { ...updated, type: existing.type };
  }
}
