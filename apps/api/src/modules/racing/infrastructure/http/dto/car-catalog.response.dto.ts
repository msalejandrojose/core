import { ApiProperty } from '@nestjs/swagger';
import { CarCatalog } from '../../../application/use-cases/list-car-catalog.use-case';
import { CarArchetypeResponseDto } from './car-archetype.response.dto';
import { CarPartResponseDto } from './car-part.response.dto';
import { CarSkinResponseDto } from './car-skin.response.dto';

export class CarCatalogSkinDto {
  @ApiProperty({ type: CarSkinResponseDto }) skin!: CarSkinResponseDto;
  @ApiProperty({
    description:
      'Puede equiparlo ya: es gratis para todos o el jugador lo tiene desbloqueado.',
  })
  owned!: boolean;
}

export class CarCatalogResponseDto {
  @ApiProperty({ type: [CarArchetypeResponseDto] })
  archetypes!: CarArchetypeResponseDto[];

  @ApiProperty({ type: [CarPartResponseDto] })
  parts!: CarPartResponseDto[];

  @ApiProperty({ type: [CarCatalogSkinDto] })
  skins!: CarCatalogSkinDto[];

  static fromDomain(catalog: CarCatalog): CarCatalogResponseDto {
    const dto = new CarCatalogResponseDto();
    dto.archetypes = catalog.archetypes.map((a) =>
      CarArchetypeResponseDto.fromDomain(a),
    );
    dto.parts = catalog.parts.map((p) => CarPartResponseDto.fromDomain(p));
    dto.skins = catalog.skins.map((entry) => {
      const skinDto = new CarCatalogSkinDto();
      skinDto.skin = CarSkinResponseDto.fromDomain(entry.skin);
      skinDto.owned = entry.owned;
      return skinDto;
    });
    return dto;
  }
}
