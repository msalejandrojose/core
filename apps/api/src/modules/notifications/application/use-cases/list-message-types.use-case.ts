import { Inject, Injectable } from '@nestjs/common';
import type { CursorPage } from '../../../../shared/pagination';
import type { MessageType } from '../../domain/entities/message-type.entity';
import {
  MESSAGE_TYPE_REPOSITORY,
  type ListMessageTypesOptions,
  type MessageTypeRepositoryPort,
} from '../ports/message-type-repository.port';

@Injectable()
export class ListMessageTypesUseCase {
  constructor(
    @Inject(MESSAGE_TYPE_REPOSITORY)
    private readonly messageTypes: MessageTypeRepositoryPort,
  ) {}

  execute(opts: ListMessageTypesOptions): Promise<CursorPage<MessageType>> {
    return this.messageTypes.list(opts);
  }
}
