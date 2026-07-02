import type { FormStatus } from '@core/shared-types';

export type { FormStatus };

export interface Form {
  id: string;
  title: string;
  description: string | null;
  schema: unknown; // JSON declarativo de campos
  status: FormStatus;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}
