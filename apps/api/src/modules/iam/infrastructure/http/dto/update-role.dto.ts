import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { type RoleScope } from '../../../domain/entities/role.entity';

const ROLE_SCOPES: RoleScope[] = ['BACKOFFICE', 'APP', 'SHARED'];

// `code` no se puede actualizar — es inmutable.
export class UpdateRoleDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ maxLength: 500, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({ enum: ROLE_SCOPES })
  @IsOptional()
  @IsIn(ROLE_SCOPES)
  scope?: RoleScope;

  @ApiPropertyOptional({ nullable: true, description: 'null = quitar parent.' })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  parentRoleId?: string | null;
}
