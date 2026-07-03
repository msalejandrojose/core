/**
 * Tipos del módulo de formularios dinámicos del backoffice.
 *
 * El `schema` de un formulario se persiste como JSON opaco en la API (que solo
 * valida `version` + `fields[].key` + `fields[].type`). El backoffice es dueño
 * de la forma concreta de ese JSON: la define aquí (`FormFieldSchema`) y la
 * traduce al schema de `@core/forms` para el preview (ver `schema.ts`).
 */

/** Envoltura de paginación por cursor devuelta por la API. */
export interface CursorPage<T> {
  data: T[];
  meta: { limit: number; nextCursor: string | null; hasMore: boolean };
}

export type FormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type FormResponsePolicy =
  | 'SINGLE_PER_LINK'
  | 'SINGLE_PER_USER'
  | 'UNLIMITED';

export type FormInstanceStatus = 'ACTIVE' | 'CLOSED';

/** Tipos de campo que ofrece el builder (subconjunto soportado por la API). */
export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'checkbox'
  | 'radio'
  | 'date';

export interface FormFieldOption {
  value: string;
  label: string;
}

/** Un campo del schema tal como lo persiste el backoffice. */
export interface FormFieldSchema {
  key: string;
  type: FormFieldType;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  /** select / multiselect / radio */
  options?: FormFieldOption[];
  /** text / textarea / email */
  minLength?: number;
  maxLength?: number;
  /** number */
  min?: number;
  max?: number;
  step?: number;
  /** text / textarea / email (regex sin delimitadores) */
  pattern?: string;
  /** textarea */
  rows?: number;
}

/** Schema completo persistido en `Form.schema`. */
export interface FormSchemaJson {
  version: number;
  fields: FormFieldSchema[];
}

export interface FormDto {
  id: string;
  title: string;
  description: string | null;
  schema: FormSchemaJson;
  status: FormStatus;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormInstanceDto {
  id: string;
  formId: string;
  hash: string;
  responsePolicy: FormResponsePolicy;
  requiresAuth: boolean;
  opensAt: string | null;
  closesAt: string | null;
  maxResponses: number | null;
  status: FormInstanceStatus;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormResponseDto {
  id: string;
  formInstanceId: string;
  submittedById: string | null;
  answers: Record<string, unknown>;
  schemaSnapshot: FormSchemaJson;
  submittedAt: string;
  ipAddress: string | null;
}

export type FormRow = Pick<
  FormDto,
  'id' | 'title' | 'status' | 'createdAt'
> & {
  fieldCount: number;
};

export const FORM_STATUSES: FormStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

export const FORM_STATUS_LABELS: Record<FormStatus, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Publicado',
  ARCHIVED: 'Archivado',
};

export const RESPONSE_POLICIES: FormResponsePolicy[] = [
  'SINGLE_PER_LINK',
  'SINGLE_PER_USER',
  'UNLIMITED',
];

export const RESPONSE_POLICY_LABELS: Record<FormResponsePolicy, string> = {
  SINGLE_PER_LINK: 'Una respuesta por enlace',
  SINGLE_PER_USER: 'Una respuesta por usuario',
  UNLIMITED: 'Respuestas ilimitadas',
};

export const INSTANCE_STATUS_LABELS: Record<FormInstanceStatus, string> = {
  ACTIVE: 'Activa',
  CLOSED: 'Cerrada',
};
