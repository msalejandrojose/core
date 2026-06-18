import { WorkflowDsl } from '../dsl/workflow-dsl';

// Blueprint de un workflow. El `dsl` se guarda como JSON y se parsea/valida con
// `workflowDslSchema` al leerlo del repositorio.
export interface WorkflowDefinition {
  id: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  dsl: WorkflowDsl;
  isActive: boolean;
  createdAt: Date;
  publishedAt: Date | null;
}
