import { ApiProperty } from '@nestjs/swagger';
import { Country } from '../../../domain/entities/country.entity';

export class CountryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() iso2: string;
  @ApiProperty() iso3: string;
  @ApiProperty({ type: String, nullable: true }) numericCode: string | null;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) nativeName: string | null;
  @ApiProperty({ type: String, nullable: true }) phoneCode: string | null;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(c: Country): CountryResponseDto {
    const dto = new CountryResponseDto();
    dto.id = c.id;
    dto.iso2 = c.iso2;
    dto.iso3 = c.iso3;
    dto.numericCode = c.numericCode;
    dto.name = c.name;
    dto.nativeName = c.nativeName;
    dto.phoneCode = c.phoneCode;
    dto.isActive = c.isActive;
    dto.createdAt = c.createdAt;
    dto.updatedAt = c.updatedAt;
    return dto;
  }
}
