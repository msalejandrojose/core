import { ApiProperty } from '@nestjs/swagger';
import {
  RESERVATION_STATUSES,
  type ReservationStatus,
} from '@core/shared-types';
import { type Reservation } from '../../../domain/entities/reservation.entity';

export class ReservationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() parkingId: string;
  @ApiProperty() guestUserId: string;
  @ApiProperty() startDate: Date;
  @ApiProperty() endDate: Date;
  @ApiProperty() totalAmount: number;
  @ApiProperty({ enum: RESERVATION_STATUSES }) status: ReservationStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(reservation: Reservation): ReservationResponseDto {
    const dto = new ReservationResponseDto();
    dto.id = reservation.id;
    dto.parkingId = reservation.parkingId;
    dto.guestUserId = reservation.guestUserId;
    dto.startDate = reservation.startDate;
    dto.endDate = reservation.endDate;
    dto.totalAmount = reservation.totalAmount;
    dto.status = reservation.status;
    dto.createdAt = reservation.createdAt;
    dto.updatedAt = reservation.updatedAt;
    return dto;
  }
}
