import { ApiProperty } from '@nestjs/swagger';
import { FriendCode } from '../../../domain/entities/friend-code.entity';

export class FriendCodeResponseDto {
  @ApiProperty({ example: 'AB23CD45' })
  code!: string;

  static fromDomain(friendCode: FriendCode): FriendCodeResponseDto {
    const dto = new FriendCodeResponseDto();
    dto.code = friendCode.code;
    return dto;
  }
}
