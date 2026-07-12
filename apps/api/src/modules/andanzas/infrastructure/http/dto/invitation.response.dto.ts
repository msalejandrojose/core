import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Invitation } from '../../../domain/entities/invitation.entity';

export class InvitationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'ABCD2345' })
  code!: string;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  expiresAt!: Date | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  static fromInvitation(invitation: Invitation): InvitationResponseDto {
    const dto = new InvitationResponseDto();
    dto.id = invitation.id;
    dto.code = invitation.code;
    dto.expiresAt = invitation.expiresAt;
    dto.createdAt = invitation.createdAt;
    return dto;
  }
}
