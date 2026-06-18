import { ApiProperty } from '@nestjs/swagger';
import { type Role, type RoleScope } from '../../../domain/entities/role.entity';

export class RoleResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: ['BACKOFFICE', 'APP', 'SHARED'] as const })
  scope!: RoleScope;

  @ApiProperty({ type: String, nullable: true })
  parentRoleId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromRole(role: Role): RoleResponseDto {
    const dto = new RoleResponseDto();
    dto.id = role.id;
    dto.code = role.code;
    dto.name = role.name;
    dto.description = role.description;
    dto.scope = role.scope;
    dto.parentRoleId = role.parentRoleId;
    dto.createdAt = role.createdAt;
    dto.updatedAt = role.updatedAt;
    return dto;
  }
}
