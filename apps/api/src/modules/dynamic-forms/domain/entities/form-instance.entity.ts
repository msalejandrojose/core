import type { FormResponsePolicy, FormInstanceStatus } from '@core/shared-types';

export type { FormResponsePolicy, FormInstanceStatus };

export interface FormInstance {
  id: string;
  formId: string;
  hash: string;
  responsePolicy: FormResponsePolicy;
  requiresAuth: boolean;
  opensAt: Date | null;
  closesAt: Date | null;
  maxResponses: number | null;
  status: FormInstanceStatus;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
}
