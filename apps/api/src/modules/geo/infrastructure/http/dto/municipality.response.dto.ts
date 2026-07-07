import { ApiProperty } from '@nestjs/swagger';
import { Municipality } from '../../../domain/entities/municipality.entity';

export class MunicipalityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiProperty() provinceId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(m: Municipality): MunicipalityResponseDto {
    const dto = new MunicipalityResponseDto();
    dto.id = m.id;
    dto.code = m.code;
    dto.name = m.name;
    dto.provinceId = m.provinceId;
    dto.createdAt = m.createdAt;
    dto.updatedAt = m.updatedAt;
    return dto;
  }
}
