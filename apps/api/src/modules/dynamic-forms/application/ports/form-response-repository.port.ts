import { CursorPage } from '../../../../shared/pagination';
import { FormResponse } from '../../domain/entities/form-response.entity';

export const FORM_RESPONSE_REPOSITORY = Symbol('DYNAMIC_FORMS_RESPONSE_REPOSITORY');

export interface CreateFormResponseData {
  formInstanceId: string;
  submittedById: string | null;
  submittedByFingerprint: string | null;
  answers: unknown;
  schemaSnapshot: unknown;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface ListFormResponsesOptions {
  formInstanceId: string;
  limit: number;
  cursor?: string;
}

export interface FormResponseRepositoryPort {
  create(data: CreateFormResponseData): Promise<FormResponse>;
  findById(id: string): Promise<FormResponse | null>;
  list(opts: ListFormResponsesOptions): Promise<CursorPage<FormResponse>>;
  // Para validar unicidad según política
  existsByUserId(instanceId: string, userId: string): Promise<boolean>;
  existsByFingerprint(instanceId: string, fingerprint: string): Promise<boolean>;
  existsByInstance(instanceId: string): Promise<boolean>;
}
