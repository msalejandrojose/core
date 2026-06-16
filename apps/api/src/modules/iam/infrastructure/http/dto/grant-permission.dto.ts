import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  PERMISSION_LEVELS,
  type PermissionLevel,
} from '../../../domain/entities/permission-level';

export class GrantPermissionDto {
  @ApiProperty({ enum: PERMISSION_LEVELS })
  @IsIn(PERMISSION_LEVELS as readonly string[])
  level!: PermissionLevel;
}
