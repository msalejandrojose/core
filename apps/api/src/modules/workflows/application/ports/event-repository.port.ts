import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { WorkflowEvent } from '../../domain/entities/event.entity';

export const EVENT_REPOSITORY = Symbol('workflows.EventRepository');

export interface CreateEventData {
  type: string;
  payload: unknown;
  sourceUserId?: string | null;
  correlationId?: string | null;
  idempotencyKey?: string | null;
}

export interface ListEventsOptions {
  type?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

export interface EventRepositoryPort {
  create(data: CreateEventData): Promise<WorkflowEvent>;
  findByIdempotencyKey(key: string): Promise<WorkflowEvent | null>;
  findById(id: string): Promise<WorkflowEvent | null>;
  list(opts: ListEventsOptions): Promise<PaginatedResult<WorkflowEvent>>;
  distinctTypes(): Promise<string[]>;
}
