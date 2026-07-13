import { ApiProperty } from '@nestjs/swagger';
import { PARKING_STATUSES, type ParkingStatus } from '@core/shared-types';
import { type Parking } from '../../../domain/entities/parking.entity';
import { FileViewTokenService } from '../../../../storage/infrastructure/http/file-view-token.service';

class ParkingPhotoResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() storedFileId: string;
  @ApiProperty() position: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() url: string;
}

export class ParkingResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() hostUserId: string;
  @ApiProperty() title: string;
  @ApiProperty({ type: String, nullable: true }) description: string | null;
  @ApiProperty() address: string;
  @ApiProperty() latitude: number;
  @ApiProperty() longitude: number;
  @ApiProperty({ type: String, nullable: true }) postalCodeId: string | null;
  @ApiProperty({ type: String, nullable: true }) accessInstructions:
    | string
    | null;
  @ApiProperty() pricePerDay: number;
  @ApiProperty({ enum: PARKING_STATUSES }) status: ParkingStatus;
  @ApiProperty() verified: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [ParkingPhotoResponseDto] })
  photos: ParkingPhotoResponseDto[];

  static fromDomain(
    parking: Parking,
    viewTokens: FileViewTokenService,
  ): ParkingResponseDto {
    const dto = new ParkingResponseDto();
    dto.id = parking.id;
    dto.hostUserId = parking.hostUserId;
    dto.title = parking.title;
    dto.description = parking.description;
    dto.address = parking.address;
    dto.latitude = parking.latitude;
    dto.longitude = parking.longitude;
    dto.postalCodeId = parking.postalCodeId;
    dto.accessInstructions = parking.accessInstructions;
    dto.pricePerDay = parking.pricePerDay;
    dto.status = parking.status;
    dto.verified = parking.verifiedAt !== null;
    dto.createdAt = parking.createdAt;
    dto.updatedAt = parking.updatedAt;
    dto.photos = parking.photos.map((p) => ({
      id: p.id,
      storedFileId: p.storedFileId,
      position: p.position,
      createdAt: p.createdAt,
      url: `/files/view?token=${viewTokens.issue(p.storedFileId)}`,
    }));
    return dto;
  }
}
