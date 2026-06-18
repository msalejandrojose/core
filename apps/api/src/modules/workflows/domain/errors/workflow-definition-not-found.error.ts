import { DomainError } from '../../../../shared/errors/domain-error';

export class WorkflowDefinitionNotFoundError extends DomainError {
  constructor(keyOrId: string) {
    super(
      'WORKFLOW_DEFINITION_NOT_FOUND',
      `Definición de workflow "${keyOrId}" no encontrada.`,
      { keyOrId },
    );
  }
}
