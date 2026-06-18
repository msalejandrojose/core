import { DomainError } from '../../../../shared/errors/domain-error';

export class WorkflowVersionConflictError extends DomainError {
  constructor(key: string, version: number) {
    super(
      'WORKFLOW_VERSION_CONFLICT',
      `Ya existe el workflow "${key}" en versión ${version}.`,
      { key, version },
    );
  }
}
