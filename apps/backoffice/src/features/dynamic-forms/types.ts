/**
 * Tipos del módulo de formularios dinámicos del backoffice.
 *
 * La forma JSON del schema (`FormFieldSchema` / `FormSchemaJson`) y el adaptador
 * al schema declarativo viven en `@core/forms` para compartirse con la web
 * pública; aquí se re-exportan por conveniencia y se añaden los DTOs y enums
 * propios del backoffice.
 */
import type {
  FormFieldOption,
  FormFieldSchema,
  FormFieldType,
  FormSchemaJson,
} from '@core/forms';

export type { FormFieldOption, FormFieldSchema, FormFieldType, FormSchemaJson };

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
