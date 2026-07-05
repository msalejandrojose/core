import { Inject, Injectable } from '@nestjs/common';
import { MessageTypeNotFoundError } from '../../domain/errors/message-type-not-found.error';
import {
  MESSAGE_TYPE_REPOSITORY,
  type MessageTypeRepositoryPort,
} from '../ports/message-type-repository.port';

@Injectable()
export class DeleteMessageTypeUseCase {
  constructor(
    @Inject(MESSAGE_TYPE_REPOSITORY)
    private readonly messageTypes: MessageTypeRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.messageTypes.findById(id);
    if (!existing) throw new MessageTypeNotFoundError(id);
    await this.messageTypes.delete(id);
  }
}
