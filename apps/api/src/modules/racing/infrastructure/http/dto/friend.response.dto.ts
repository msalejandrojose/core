import { ApiProperty } from '@nestjs/swagger';
import {
  Friend,
  FriendshipRequest,
} from '../../../domain/entities/friendship.entity';

export class FriendResponseDto {
  @ApiProperty()
  userId!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  friendsSince!: Date;

  static fromDomain(friend: Friend): FriendResponseDto {
    const dto = new FriendResponseDto();
    dto.userId = friend.userId;
    dto.displayName = friend.displayName;
    dto.friendsSince = friend.friendsSince;
    return dto;
  }
}

export class FriendshipRequestResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  requesterId!: string;

  @ApiProperty()
  requesterDisplayName!: string;

  @ApiProperty()
  createdAt!: Date;

  static fromDomain(request: FriendshipRequest): FriendshipRequestResponseDto {
    const dto = new FriendshipRequestResponseDto();
    dto.id = request.id;
    dto.requesterId = request.requesterId;
    dto.requesterDisplayName = request.requesterDisplayName;
    dto.createdAt = request.createdAt;
    return dto;
  }
}
