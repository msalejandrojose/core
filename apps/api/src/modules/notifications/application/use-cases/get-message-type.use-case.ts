import { Inject, Injectable } from '@nestjs/common';
import type { MessageType } from '../../domain/entities/message-type.entity';
import { MessageTypeNotFoundError } from '../../domain/errors/message-type-not-found.error';
import {
  MESSAGE_TYPE_REPOSITORY,
  type MessageTypeRepositoryPort,
} from '../ports/message-type-repository.port';

@Injectable()
export class GetMessageTypeUseCase {
  constructor(
    @Inject(MESSAGE_TYPE_REPOSITORY)
    private readonly messageTypes: MessageTypeRepositoryPort,
  ) {}

  async execute(id: string): Promise<MessageType> {
    const messageType = await this.messageTypes.findById(id);
    if (!messageType) throw new MessageTypeNotFoundError(id);
    return messageType;
  }
}
