import { ApiProperty } from '@nestjs/swagger';
import {
  HOST_VERIFICATION_STATUSES,
  type HostVerificationStatus,
} from '@core/shared-types';
import { type HostVerification } from '../../../domain/entities/host-verification.entity';
import { FileViewTokenService } from '../../../../storage/infrastructure/http/file-view-token.service';

export class HostVerificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() hostUserId: string;
  @ApiProperty() legalName: string;
  @ApiProperty() documentFileId: string;
  @ApiProperty({
    description: 'URL para visualizar el documento (token de corta duración).',
  })
  documentUrl: string;
  @ApiProperty({ enum: HOST_VERIFICATION_STATUSES })
  status: HostVerificationStatus;
  @ApiProperty({ type: String, nullable: true }) reviewedByUserId:
    | string
    | null;
  @ApiProperty({ type: Date, nullable: true }) reviewedAt: Date | null;
  @ApiProperty({ type: String, nullable: true }) rejectionReason: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(
    v: HostVerification,
    viewTokens: FileViewTokenService,
  ): HostVerificationResponseDto {
    const dto = new HostVerificationResponseDto();
    dto.id = v.id;
    dto.hostUserId = v.hostUserId;
    dto.legalName = v.legalName;
    dto.documentFileId = v.documentFileId;
    dto.documentUrl = `/files/view?token=${viewTokens.issue(v.documentFileId)}`;
    dto.status = v.status;
    dto.reviewedByUserId = v.reviewedByUserId;
    dto.reviewedAt = v.reviewedAt;
    dto.rejectionReason = v.rejectionReason;
    dto.createdAt = v.createdAt;
    dto.updatedAt = v.updatedAt;
    return dto;
  }
}
