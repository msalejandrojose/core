import { ApiProperty } from '@nestjs/swagger';
import { type ApiSection } from '../../../domain/entities/api-section.entity';

export class ApiSectionResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  parentSectionId!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromApiSection(s: ApiSection): ApiSectionResponseDto {
    const dto = new ApiSectionResponseDto();
    dto.id = s.id;
    dto.code = s.code;
    dto.name = s.name;
    dto.description = s.description;
    dto.parentSectionId = s.parentSectionId;
    dto.createdAt = s.createdAt;
    dto.updatedAt = s.updatedAt;
    return dto;
  }
}
