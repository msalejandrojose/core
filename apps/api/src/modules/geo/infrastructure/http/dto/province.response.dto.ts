import { ApiProperty } from '@nestjs/swagger';
import { Province } from '../../../domain/entities/province.entity';

export class ProvinceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() countryId: string;
  @ApiProperty({ type: String, nullable: true }) regionId: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(p: Province): ProvinceResponseDto {
    const dto = new ProvinceResponseDto();
    dto.id = p.id;
    dto.code = p.code;
    dto.name = p.name;
    dto.countryId = p.countryId;
    dto.regionId = p.regionId;
    dto.createdAt = p.createdAt;
    dto.updatedAt = p.updatedAt;
    return dto;
  }
}
