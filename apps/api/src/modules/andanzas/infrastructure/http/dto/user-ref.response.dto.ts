import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { UserRef } from '../../../domain/entities/user-ref.entity';

export class UserRefResponseDto {
  @ApiProperty()
  id!: string;

  @ApiPropertyOptional({ nullable: true })
  firstName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastName!: string | null;

  static fromUserRef(userRef: UserRef): UserRefResponseDto {
    const dto = new UserRefResponseDto();
    dto.id = userRef.id;
    dto.firstName = userRef.firstName;
    dto.lastName = userRef.lastName;
    return dto;
  }
}
