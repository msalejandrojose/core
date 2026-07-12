import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class FollowUserDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  followingId!: string;
}
