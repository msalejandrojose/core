import { DomainError } from '../../../../shared/errors/domain-error';

export class WorkflowRunNotFoundError extends DomainError {
  constructor(id: string) {
    super('WORKFLOW_RUN_NOT_FOUND', `Run "${id}" no encontrado.`, { id });
  }
}
