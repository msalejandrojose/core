import { CursorPage } from '../../../../shared/pagination';
import { Form, FormStatus } from '../../domain/entities/form.entity';

export const FORM_REPOSITORY = Symbol('DYNAMIC_FORMS_FORM_REPOSITORY');

export interface CreateFormData {
  title: string;
  description: string | null;
  schema: unknown;
  createdById: string | null;
}

export interface UpdateFormPatch {
  title?: string;
  description?: string | null;
  schema?: unknown;
  status?: FormStatus;
}

export interface ListFormsOptions {
  limit: number;
  cursor?: string;
  status?: FormStatus;
  titleContains?: string;
}

export interface FormRepositoryPort {
  create(data: CreateFormData): Promise<Form>;
  update(id: string, patch: UpdateFormPatch): Promise<Form>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Form | null>;
  list(opts: ListFormsOptions): Promise<CursorPage<Form>>;
}
