import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { type UserType } from '../../../domain/entities/user.entity';

const USER_TYPES: UserType[] = ['BACKOFFICE', 'APP'];

// Body de POST /users (admin). A diferencia de /auth/register, este admite
// `isActive` para crear desactivado y activar luego.
export class CreateUserDto {
  @ApiProperty({ example: 'user@core.dev' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ enum: USER_TYPES, example: 'BACKOFFICE' })
  @IsIn(USER_TYPES)
  userType!: UserType;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
