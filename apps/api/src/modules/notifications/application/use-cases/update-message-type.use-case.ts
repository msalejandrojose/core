import { Inject, Injectable } from '@nestjs/common';
import { channelDefinition } from '../../domain/channels/channel-catalog';
import { validateFields } from '../../domain/channels/validate-fields';
import type { MessageType } from '../../domain/entities/message-type.entity';
import type { SendingAccount } from '../../domain/entities/sending-account.entity';
import { InvalidMessageContentError } from '../../domain/errors/invalid-message-content.error';
import { MessageTypeNotFoundError } from '../../domain/errors/message-type-not-found.error';
import { SendingAccountNotFoundError } from '../../domain/errors/sending-account-not-found.error';
import {
  MESSAGE_TYPE_REPOSITORY,
  type MessageTypeRepositoryPort,
  type UpdateMessageTypeData,
} from '../ports/message-type-repository.port';
import {
  SENDING_ACCOUNT_REPOSITORY,
  type SendingAccountRepositoryPort,
} from '../ports/sending-account-repository.port';

export interface UpdateMessageTypeInput {
  name?: string;
  accountId?: string;
  content?: Record<string, unknown>;
  isActive?: boolean;
}

@Injectable()
export class UpdateMessageTypeUseCase {
  constructor(
    @Inject(MESSAGE_TYPE_REPOSITORY)
    private readonly messageTypes: MessageTypeRepositoryPort,
    @Inject(SENDING_ACCOUNT_REPOSITORY)
    private readonly accounts: SendingAccountRepositoryPort,
  ) {}

  async execute(
    id: string,
    input: UpdateMessageTypeInput,
  ): Promise<MessageType> {
    const existing = await this.messageTypes.findById(id);
    if (!existing || !existing.account) throw new MessageTypeNotFoundError(id);

    // Si se cambia de cuenta puede cambiar el canal: hay que revalidar el
    // contenido (nuevo o el existente) contra el canal efectivo.
    let account: SendingAccount = existing.account;
    if (
      input.accountId !== undefined &&
      input.accountId !== existing.accountId
    ) {
      const next = await this.accounts.findById(input.accountId);
      if (!next || !next.type) {
        throw new SendingAccountNotFoundError(input.accountId);
      }
      account = next;
    }

    const effectiveContent = input.content ?? existing.content;
    const fields = channelDefinition(account.type!.channel).message;
    const error = validateFields(fields, effectiveContent, true);
    if (error) throw new InvalidMessageContentError(error);

    const data: UpdateMessageTypeData = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.accountId !== undefined) data.accountId = account.id;
    if (input.content !== undefined) data.content = input.content;

    const updated = await this.messageTypes.update(id, data);
    return { ...updated, account };
  }
}
