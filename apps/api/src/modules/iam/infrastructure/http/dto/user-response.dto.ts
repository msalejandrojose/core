import { ApiProperty } from '@nestjs/swagger';
import { type User, type UserType } from '../../../domain/entities/user.entity';

// Representación pública del usuario. NUNCA incluye `passwordHash` ni datos
// internos de auditoría. Se construye explícitamente con `fromUser` para que
// añadir un campo nuevo a `User` no lo filtre por accidente al cliente.
export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ enum: ['BACKOFFICE', 'APP'] as const })
  userType!: UserType;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  static fromUser(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.userType = user.userType;
    dto.isActive = user.isActive;
    dto.lastLoginAt = user.lastLoginAt;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
