import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../../../shared/http/dto/pagination-query.dto';
import { type RoleScope } from '../../../domain/entities/role.entity';

const ROLE_SCOPES: RoleScope[] = ['BACKOFFICE', 'APP', 'SHARED'];

export class ListRolesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ROLE_SCOPES })
  @IsOptional()
  @IsIn(ROLE_SCOPES)
  scope?: RoleScope;

  @ApiPropertyOptional({ description: 'Subcadena en el code.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  codeContains?: string;
}
