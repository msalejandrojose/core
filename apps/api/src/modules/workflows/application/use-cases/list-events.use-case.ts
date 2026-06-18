import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { WorkflowEvent } from '../../domain/entities/event.entity';
import {
  EVENT_REPOSITORY,
  type EventRepositoryPort,
  type ListEventsOptions,
} from '../ports/event-repository.port';

@Injectable()
export class ListEventsUseCase {
  constructor(
    @Inject(EVENT_REPOSITORY) private readonly events: EventRepositoryPort,
  ) {}

  list(opts: ListEventsOptions): Promise<PaginatedResult<WorkflowEvent>> {
    return this.events.list(opts);
  }

  distinctTypes(): Promise<string[]> {
    return this.events.distinctTypes();
  }
}
