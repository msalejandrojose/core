import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { channelDefinition } from '../../domain/channels/channel-catalog';
import { validateFields } from '../../domain/channels/validate-fields';
import type { MessageType } from '../../domain/entities/message-type.entity';
import { InvalidMessageContentError } from '../../domain/errors/invalid-message-content.error';
import { SendingAccountNotFoundError } from '../../domain/errors/sending-account-not-found.error';
import {
  MESSAGE_TYPE_REPOSITORY,
  type MessageTypeRepositoryPort,
} from '../ports/message-type-repository.port';
import {
  SENDING_ACCOUNT_REPOSITORY,
  type SendingAccountRepositoryPort,
} from '../ports/sending-account-repository.port';

export interface CreateMessageTypeInput {
  key: string;
  name: string;
  accountId: string;
  content: Record<string, unknown>;
  isActive?: boolean;
}

@Injectable()
export class CreateMessageTypeUseCase {
  constructor(
    @Inject(MESSAGE_TYPE_REPOSITORY)
    private readonly messageTypes: MessageTypeRepositoryPort,
    @Inject(SENDING_ACCOUNT_REPOSITORY)
    private readonly accounts: SendingAccountRepositoryPort,
  ) {}

  async execute(input: CreateMessageTypeInput): Promise<MessageType> {
    const account = await this.accounts.findById(input.accountId);
    if (!account || !account.type) {
      throw new SendingAccountNotFoundError(input.accountId);
    }

    const key = input.key.trim();
    const existing = await this.messageTypes.findByKey(key);
    if (existing) {
      throw new ConflictException(`Ya existe un tipo de mensaje "${key}".`);
    }

    // La cuenta determina el canal ⇒ qué campos de contenido son válidos.
    const fields = channelDefinition(account.type.channel).message;
    const error = validateFields(fields, input.content, true);
    if (error) throw new InvalidMessageContentError(error);

    const created = await this.messageTypes.create({
      key,
      name: input.name.trim(),
      accountId: account.id,
      content: input.content,
      isActive: input.isActive ?? true,
    });

    return { ...created, account };
  }
}
