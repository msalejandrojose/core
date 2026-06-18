import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';

export const WORKFLOW_DEFINITION_REPOSITORY = Symbol(
  'workflows.WorkflowDefinitionRepository',
);

export interface CreateDefinitionData {
  key: string;
  version: number;
  name: string;
  description: string | null;
  dsl: unknown; // JSON serializable (el DSL ya validado)
  isActive: boolean;
}

export interface ListDefinitionsOptions {
  page: number;
  limit: number;
  onlyActive?: boolean;
}

export interface WorkflowDefinitionRepositoryPort {
  create(data: CreateDefinitionData): Promise<WorkflowDefinition>;
  findById(id: string): Promise<WorkflowDefinition | null>;
  findActiveByKey(key: string): Promise<WorkflowDefinition | null>;
  findByKeyVersion(
    key: string,
    version: number,
  ): Promise<WorkflowDefinition | null>;
  listVersions(key: string): Promise<WorkflowDefinition[]>;
  list(
    opts: ListDefinitionsOptions,
  ): Promise<PaginatedResult<WorkflowDefinition>>;
  hasAnyVersion(key: string): Promise<boolean>;
  // Activa (key,version) y desactiva el resto de versiones de esa key (atómico).
  setActiveVersion(key: string, version: number): Promise<void>;
}
