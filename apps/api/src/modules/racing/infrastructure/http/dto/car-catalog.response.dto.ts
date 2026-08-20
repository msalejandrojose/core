import { ApiProperty } from '@nestjs/swagger';
import { CarCatalog } from '../../../application/use-cases/list-car-catalog.use-case';
import { CarArchetypeResponseDto } from './car-archetype.response.dto';
import { CarPartResponseDto } from './car-part.response.dto';
import { CarSkinResponseDto } from './car-skin.response.dto';

const OWNED_DESCRIPTION =
  'Puede equiparlo ya: es gratis para todos o el jugador lo tiene desbloqueado.';

export class CarCatalogArchetypeDto {
  @ApiProperty({ type: CarArchetypeResponseDto })
  archetype!: CarArchetypeResponseDto;
  @ApiProperty({ description: OWNED_DESCRIPTION }) owned!: boolean;
}

export class CarCatalogPartDto {
  @ApiProperty({ type: CarPartResponseDto }) part!: CarPartResponseDto;
  @ApiProperty({ description: OWNED_DESCRIPTION }) owned!: boolean;
}

export class CarCatalogSkinDto {
  @ApiProperty({ type: CarSkinResponseDto }) skin!: CarSkinResponseDto;
  @ApiProperty({ description: OWNED_DESCRIPTION }) owned!: boolean;
}

export class CarCatalogResponseDto {
  @ApiProperty({ type: [CarCatalogArchetypeDto] })
  archetypes!: CarCatalogArchetypeDto[];

  @ApiProperty({ type: [CarCatalogPartDto] })
  parts!: CarCatalogPartDto[];

  @ApiProperty({ type: [CarCatalogSkinDto] })
  skins!: CarCatalogSkinDto[];

  static fromDomain(catalog: CarCatalog): CarCatalogResponseDto {
    const dto = new CarCatalogResponseDto();
    dto.archetypes = catalog.archetypes.map((entry) => {
      const archetypeDto = new CarCatalogArchetypeDto();
      archetypeDto.archetype = CarArchetypeResponseDto.fromDomain(
        entry.archetype,
      );
      archetypeDto.owned = entry.owned;
      return archetypeDto;
    });
    dto.parts = catalog.parts.map((entry) => {
      const partDto = new CarCatalogPartDto();
      partDto.part = CarPartResponseDto.fromDomain(entry.part);
      partDto.owned = entry.owned;
      return partDto;
    });
    dto.skins = catalog.skins.map((entry) => {
      const skinDto = new CarCatalogSkinDto();
      skinDto.skin = CarSkinResponseDto.fromDomain(entry.skin);
      skinDto.owned = entry.owned;
      return skinDto;
    });
    return dto;
  }
}
