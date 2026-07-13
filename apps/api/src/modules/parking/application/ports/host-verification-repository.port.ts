import type { HostVerificationStatus } from '@core/shared-types';
import { CursorPage } from '../../../../shared/pagination';
import { HostVerification } from '../../domain/entities/host-verification.entity';

export const HOST_VERIFICATION_REPOSITORY = Symbol(
  'PARKING_HOST_VERIFICATION_REPOSITORY',
);

export interface UpsertHostVerificationData {
  hostUserId: string;
  legalName: string;
  documentFileId: string;
}

export interface ListHostVerificationsOptions {
  limit: number;
  cursor?: string;
  status?: HostVerificationStatus;
}

export interface ReviewHostVerificationData {
  status: HostVerificationStatus;
  reviewedByUserId: string;
  rejectionReason?: string | null;
}

export interface HostVerificationRepositoryPort {
  /** Crea la solicitud o, si el host ya tenía una, la reemplaza (vuelve a `PENDING`). */
  upsert(data: UpsertHostVerificationData): Promise<HostVerification>;
  findById(id: string): Promise<HostVerification | null>;
  findByHostUserId(hostUserId: string): Promise<HostVerification | null>;
  list(
    opts: ListHostVerificationsOptions,
  ): Promise<CursorPage<HostVerification>>;
  review(
    id: string,
    data: ReviewHostVerificationData,
  ): Promise<HostVerification>;
}
