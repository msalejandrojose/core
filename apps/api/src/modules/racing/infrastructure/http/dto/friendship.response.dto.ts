import { ApiProperty } from '@nestjs/swagger';
import { Friendship } from '../../../domain/entities/friendship.entity';

export class FriendshipResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  requesterId!: string;

  @ApiProperty()
  addresseeId!: string;

  @ApiProperty({ enum: ['PENDING', 'ACCEPTED', 'REJECTED'] })
  status!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: Date, nullable: true })
  respondedAt!: Date | null;

  static fromDomain(friendship: Friendship): FriendshipResponseDto {
    const dto = new FriendshipResponseDto();
    dto.id = friendship.id;
    dto.requesterId = friendship.requesterId;
    dto.addresseeId = friendship.addresseeId;
    dto.status = friendship.status;
    dto.createdAt = friendship.createdAt;
    dto.respondedAt = friendship.respondedAt;
    return dto;
  }
}
