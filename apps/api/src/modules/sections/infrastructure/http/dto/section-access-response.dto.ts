import { ApiProperty } from '@nestjs/swagger';
import type {
  RoleSectionAccessRecord,
  SectionAccessType,
  UserSectionAccessRecord,
} from '../../../domain/entities/section.entity';

class RoleAccessEntryDto {
  @ApiProperty() userRoleId!: string;
  @ApiProperty() sectionId!: string;
  @ApiProperty({ enum: ['GRANT', 'DENY'] }) access!: SectionAccessType;
}

class UserAccessEntryDto {
  @ApiProperty() userId!: string;
  @ApiProperty() sectionId!: string;
  @ApiProperty({ enum: ['GRANT', 'DENY'] }) access!: SectionAccessType;
}

export class SectionAccessResponseDto {
  @ApiProperty({ type: [RoleAccessEntryDto] }) roleAccess!: RoleAccessEntryDto[];
  @ApiProperty({ type: [UserAccessEntryDto] }) userAccess!: UserAccessEntryDto[];

  static fromDomain(
    roleAccess: RoleSectionAccessRecord[],
    userAccess: UserSectionAccessRecord[],
  ): SectionAccessResponseDto {
    const dto = new SectionAccessResponseDto();
    dto.roleAccess = roleAccess;
    dto.userAccess = userAccess;
    return dto;
  }
}
