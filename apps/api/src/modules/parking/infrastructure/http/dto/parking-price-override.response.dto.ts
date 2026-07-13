import { ApiProperty } from '@nestjs/swagger';
import { type ParkingPriceOverride } from '../../../domain/entities/parking-price-override.entity';

export class ParkingPriceOverrideResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() parkingId: string;
  @ApiProperty() startDate: Date;
  @ApiProperty() endDate: Date;
  @ApiProperty() pricePerDay: number;
  @ApiProperty({ type: String, nullable: true }) label: string | null;
  @ApiProperty() createdAt: Date;

  static fromDomain(
    override: ParkingPriceOverride,
  ): ParkingPriceOverrideResponseDto {
    const dto = new ParkingPriceOverrideResponseDto();
    dto.id = override.id;
    dto.parkingId = override.parkingId;
    dto.startDate = override.startDate;
    dto.endDate = override.endDate;
    dto.pricePerDay = override.pricePerDay;
    dto.label = override.label;
    dto.createdAt = override.createdAt;
    return dto;
  }
}
