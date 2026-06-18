import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidWorkflowDefinitionError extends DomainError {
  constructor(issues: string, context?: Record<string, unknown>) {
    super('WORKFLOW_DSL_INVALID', `DSL inválido: ${issues}`, context);
  }
}
