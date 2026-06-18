import { Inject, Injectable } from '@nestjs/common';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import { WorkflowDefinitionNotFoundError } from '../../domain/errors/workflow-definition-not-found.error';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  type WorkflowDefinitionRepositoryPort,
} from '../ports/workflow-definition-repository.port';

// Activa una versión concreta de un workflow y desactiva las demás de esa key.
// Los runs vivos NO se migran (cada run congela su `definitionId`).
@Injectable()
export class ActivateWorkflowDefinitionUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
  ) {}

  async execute(key: string, version: number): Promise<WorkflowDefinition> {
    const target = await this.definitions.findByKeyVersion(key, version);
    if (!target) {
      throw new WorkflowDefinitionNotFoundError(`${key} v${version}`);
    }
    await this.definitions.setActiveVersion(key, version);
    const updated = await this.definitions.findByKeyVersion(key, version);
    return updated ?? target;
  }
}
