import { DomainError } from '../../../../shared/errors/domain-error';

export class WorkflowRunNotRetryableError extends DomainError {
  constructor(id: string, status: string) {
    super(
      'WORKFLOW_RUN_NOT_RETRYABLE',
      `El run "${id}" está en estado ${status}; solo se puede reintentar un run FAILED.`,
      { id, status },
    );
  }
}
