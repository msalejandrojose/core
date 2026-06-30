export type FormResponsePolicy = 'SINGLE_PER_LINK' | 'SINGLE_PER_USER' | 'UNLIMITED';
export type FormInstanceStatus = 'ACTIVE' | 'CLOSED';

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
