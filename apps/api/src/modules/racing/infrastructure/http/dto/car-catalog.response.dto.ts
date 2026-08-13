import { ApiProperty } from '@nestjs/swagger';
import { CarCatalog } from '../../../application/use-cases/list-car-catalog.use-case';
import { CarArchetypeResponseDto } from './car-archetype.response.dto';
import { CarPartResponseDto } from './car-part.response.dto';

export class CarCatalogResponseDto {
  @ApiProperty({ type: [CarArchetypeResponseDto] })
  archetypes!: CarArchetypeResponseDto[];

  @ApiProperty({ type: [CarPartResponseDto] })
  parts!: CarPartResponseDto[];

  static fromDomain(catalog: CarCatalog): CarCatalogResponseDto {
    const dto = new CarCatalogResponseDto();
    dto.archetypes = catalog.archetypes.map((a) =>
      CarArchetypeResponseDto.fromDomain(a),
    );
    dto.parts = catalog.parts.map((p) => CarPartResponseDto.fromDomain(p));
    return dto;
  }
}
