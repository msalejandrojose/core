import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import { WorkflowDefinitionNotFoundError } from '../../domain/errors/workflow-definition-not-found.error';
import {
  WORKFLOW_DEFINITION_REPOSITORY,
  type ListDefinitionsOptions,
  type WorkflowDefinitionRepositoryPort,
} from '../ports/workflow-definition-repository.port';

@Injectable()
export class ListWorkflowDefinitionsUseCase {
  constructor(
    @Inject(WORKFLOW_DEFINITION_REPOSITORY)
    private readonly definitions: WorkflowDefinitionRepositoryPort,
  ) {}

  list(
    opts: ListDefinitionsOptions,
  ): Promise<PaginatedResult<WorkflowDefinition>> {
    return this.definitions.list(opts);
  }

  async getActiveByKey(key: string): Promise<WorkflowDefinition> {
    const def = await this.definitions.findActiveByKey(key);
    if (!def) throw new WorkflowDefinitionNotFoundError(key);
    return def;
  }

  async listVersions(key: string): Promise<WorkflowDefinition[]> {
    const versions = await this.definitions.listVersions(key);
    if (versions.length === 0) throw new WorkflowDefinitionNotFoundError(key);
    return versions;
  }
}
