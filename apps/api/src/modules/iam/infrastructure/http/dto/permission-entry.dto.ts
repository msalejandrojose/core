import { ApiProperty } from '@nestjs/swagger';
import {
  PERMISSION_LEVELS,
  type PermissionLevel,
} from '../../../domain/entities/permission-level';

export class PermissionEntryDto {
  @ApiProperty()
  apiSectionId!: string;

  @ApiProperty({ enum: PERMISSION_LEVELS })
  level!: PermissionLevel;

  static of(apiSectionId: string, level: PermissionLevel): PermissionEntryDto {
    const dto = new PermissionEntryDto();
    dto.apiSectionId = apiSectionId;
    dto.level = level;
    return dto;
  }
}
