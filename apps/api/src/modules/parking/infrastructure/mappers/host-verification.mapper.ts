import type { HostVerificationStatus } from '@core/shared-types';
import { HostVerification } from '../../domain/entities/host-verification.entity';

export interface HostVerificationRow {
  id: string;
  hostUserId: string;
  legalName: string;
  documentFileId: string;
  status: string;
  reviewedByUserId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toHostVerificationDomain(
  row: HostVerificationRow,
): HostVerification {
  return {
    id: row.id,
    hostUserId: row.hostUserId,
    legalName: row.legalName,
    documentFileId: row.documentFileId,
    status: row.status as HostVerificationStatus,
    reviewedByUserId: row.reviewedByUserId,
    reviewedAt: row.reviewedAt,
    rejectionReason: row.rejectionReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
