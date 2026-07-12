import { ApiProperty } from '@nestjs/swagger';
import { type Parking } from '../../../domain/entities/parking.entity';
import { FileViewTokenService } from '../../../../storage/infrastructure/http/file-view-token.service';

function resolvePhotoUrls(
  parking: Parking,
  viewTokens: FileViewTokenService,
): string[] {
  return parking.photos.map(
    (p) => `/files/view?token=${viewTokens.issue(p.storedFileId)}`,
  );
}

// Versión ligera para el buscador: sin `description`/`accessInstructions`.
export class PublicParkingSummaryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty() address: string;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiProperty() pricePerDay: number;
  @ApiProperty({ type: String, nullable: true }) coverPhotoUrl: string | null;

  static fromDomain(
    parking: Parking,
    viewTokens: FileViewTokenService,
  ): PublicParkingSummaryResponseDto {
    const dto = new PublicParkingSummaryResponseDto();
    dto.id = parking.id;
    dto.title = parking.title;
    dto.address = parking.address;
    dto.latitude = parking.latitude;
    dto.longitude = parking.longitude;
    dto.pricePerDay = parking.pricePerDay;
    const urls = resolvePhotoUrls(parking, viewTokens);
    dto.coverPhotoUrl = urls[0] ?? null;
    return dto;
  }
}

// `accessInstructions` es deliberadamente NO pública: solo debe verse tras
// una reserva confirmada (módulo `parking` en la app, fuera de alcance aquí).
export class PublicParkingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty() address: string;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiProperty() pricePerDay: number;
  @ApiProperty({ type: [String] }) photoUrls: string[];

  static fromDomain(
    parking: Parking,
    viewTokens: FileViewTokenService,
  ): PublicParkingResponseDto {
    const dto = new PublicParkingResponseDto();
    dto.id = parking.id;
    dto.title = parking.title;
    dto.description = parking.description;
    dto.address = parking.address;
    dto.latitude = parking.latitude;
    dto.longitude = parking.longitude;
    dto.pricePerDay = parking.pricePerDay;
    dto.photoUrls = resolvePhotoUrls(parking, viewTokens);
    return dto;
  }
}
