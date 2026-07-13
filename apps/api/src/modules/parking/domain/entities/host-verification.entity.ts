import type { HostVerificationStatus } from '@core/shared-types';

export type { HostVerificationStatus };

export interface HostVerification {
  id: string;
  hostUserId: string;
  legalName: string;
  documentFileId: string;
  status: HostVerificationStatus;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}
