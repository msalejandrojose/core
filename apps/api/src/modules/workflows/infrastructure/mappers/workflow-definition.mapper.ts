import { WorkflowDefinition as WorkflowDefinitionRow } from '../../../../generated/prisma/client';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import { workflowDslSchema } from '../../domain/dsl/workflow-dsl';

export class WorkflowDefinitionMapper {
  static toDomain(row: WorkflowDefinitionRow): WorkflowDefinition {
    return {
      id: row.id,
      key: row.key,
      version: row.version,
      name: row.name,
      description: row.description,
      // El DSL fue validado al publicar; se re-parsea para tiparlo fuerte.
      dsl: workflowDslSchema.parse(row.dsl),
      isActive: row.isActive,
      createdAt: row.createdAt,
      publishedAt: row.publishedAt,
    };
  }
}
