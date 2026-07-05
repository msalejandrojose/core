import { ConflictException, Inject, Injectable } from '@nestjs/common';
import type { NotificationChannel } from '@core/shared-types';
import { channelDefinition } from '../../domain/channels/channel-catalog';
import type { SendingAccountType } from '../../domain/entities/sending-account-type.entity';
import {
  SENDING_ACCOUNT_TYPE_REPOSITORY,
  type SendingAccountTypeRepositoryPort,
} from '../ports/sending-account-type-repository.port';

export interface CreateSendingAccountTypeInput {
  key: string;
  name: string;
  channel: NotificationChannel;
  isActive?: boolean;
}

@Injectable()
export class CreateSendingAccountTypeUseCase {
  constructor(
    @Inject(SENDING_ACCOUNT_TYPE_REPOSITORY)
    private readonly types: SendingAccountTypeRepositoryPort,
  ) {}

  async execute(
    input: CreateSendingAccountTypeInput,
  ): Promise<SendingAccountType> {
    const key = input.key.trim();
    const existing = await this.types.findByKey(key);
    if (existing) {
      throw new ConflictException(`Ya existe un tipo de cuenta "${key}".`);
    }

    // Los descriptores se derivan del catálogo de canales (fuente de verdad en
    // código): así la BBDD nunca diverge de lo que el sistema sabe validar.
    const def = channelDefinition(input.channel);

    return this.types.create({
      key,
      name: input.name.trim(),
      channel: input.channel,
      configSchema: def.config,
      messageSchema: def.message,
      isActive: input.isActive ?? true,
    });
  }
}
