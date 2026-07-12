import { ApiProperty } from '@nestjs/swagger';

export class RedeemInvitationResponseDto {
  @ApiProperty()
  userId!: string;

  static of(userId: string): RedeemInvitationResponseDto {
    const dto = new RedeemInvitationResponseDto();
    dto.userId = userId;
    return dto;
  }
}
