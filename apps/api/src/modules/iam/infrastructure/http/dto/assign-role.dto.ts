import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ description: 'Id del rol a asignar.' })
  @IsUUID()
  roleId!: string;
}
