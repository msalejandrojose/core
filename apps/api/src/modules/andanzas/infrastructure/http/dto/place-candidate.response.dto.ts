import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PlaceCandidate } from '../../../application/ports/site-place-search.port';

export class PlaceCandidateResponseDto {
  @ApiProperty({ description: 'Pasar tal cual a POST /andanzas/sites como externalPlaceId.' })
  externalPlaceId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  address!: string | null;

  @ApiProperty()
  latitude!: number;

  @ApiProperty()
  longitude!: number;

  static fromCandidate(candidate: PlaceCandidate): PlaceCandidateResponseDto {
    const dto = new PlaceCandidateResponseDto();
    dto.externalPlaceId = candidate.externalPlaceId;
    dto.name = candidate.name;
    dto.address = candidate.address;
    dto.latitude = candidate.latitude;
    dto.longitude = candidate.longitude;
    return dto;
  }
}
