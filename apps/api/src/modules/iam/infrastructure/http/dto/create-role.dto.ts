import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { type RoleScope } from '../../../domain/entities/role.entity';

const ROLE_SCOPES: RoleScope[] = ['BACKOFFICE', 'APP', 'SHARED'];

export class CreateRoleDto {
  @ApiProperty({
    description: 'Identificador legible inmutable. Solo lowercase, dígitos, `_` y `-`.',
    example: 'admin',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9_-]+$/, {
    message: 'code debe contener solo lowercase, dígitos, `_` y `-`.',
  })
  code!: string;

  @ApiProperty({ example: 'Administrador' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ enum: ROLE_SCOPES })
  @IsIn(ROLE_SCOPES)
  scope!: RoleScope;

  @ApiPropertyOptional({ description: 'Rol padre (para herencia).' })
  @IsOptional()
  @IsUUID()
  parentRoleId?: string;
}
