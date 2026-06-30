import { CursorPage } from '../../../../shared/pagination';
import { FormInstance, FormInstanceStatus, FormResponsePolicy } from '../../domain/entities/form-instance.entity';

export const FORM_INSTANCE_REPOSITORY = Symbol('DYNAMIC_FORMS_INSTANCE_REPOSITORY');

export interface CreateFormInstanceData {
  formId: string;
  hash: string;
  responsePolicy: FormResponsePolicy;
  requiresAuth: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  maxResponses: number | null;
  createdById: string | null;
}

export interface UpdateFormInstancePatch {
  responsePolicy?: FormResponsePolicy;
  requiresAuth?: boolean;
  opensAt?: Date | null;
  closesAt?: Date | null;
  maxResponses?: number | null;
  status?: FormInstanceStatus;
}

export interface ListFormInstancesOptions {
  formId: string;
  limit: number;
  cursor?: string;
}

export interface FormInstanceRepositoryPort {
  create(data: CreateFormInstanceData): Promise<FormInstance>;
  update(id: string, patch: UpdateFormInstancePatch): Promise<FormInstance>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<FormInstance | null>;
  findByHash(hash: string): Promise<FormInstance | null>;
  list(opts: ListFormInstancesOptions): Promise<CursorPage<FormInstance>>;
  countResponses(instanceId: string): Promise<number>;
}
