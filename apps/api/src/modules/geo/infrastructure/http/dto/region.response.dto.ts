import { ApiProperty } from '@nestjs/swagger';
import { Region } from '../../../domain/entities/region.entity';

export class RegionResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() countryId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(r: Region): RegionResponseDto {
    const dto = new RegionResponseDto();
    dto.id = r.id;
    dto.code = r.code;
    dto.name = r.name;
    dto.countryId = r.countryId;
    dto.createdAt = r.createdAt;
    dto.updatedAt = r.updatedAt;
    return dto;
  }
}
