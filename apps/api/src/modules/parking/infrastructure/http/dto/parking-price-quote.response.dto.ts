import { ApiProperty } from '@nestjs/swagger';
import { type ParkingPriceQuote } from '../../../application/use-cases/get-parking-price-quote.use-case';

/** Precio total de una plaza para un rango de fechas, con precios dinámicos (TASK-146) ya aplicados. */
export class ParkingPriceQuoteResponseDto {
  @ApiProperty() nights: number;
  @ApiProperty() totalAmount: number;
  @ApiProperty({ description: 'Media de `totalAmount / nights`, informativa.' })
  pricePerDayAverage: number;

  static fromDomain(quote: ParkingPriceQuote): ParkingPriceQuoteResponseDto {
    const dto = new ParkingPriceQuoteResponseDto();
    dto.nights = quote.nights;
    dto.totalAmount = quote.totalAmount;
    dto.pricePerDayAverage = quote.pricePerDayAverage;
    return dto;
  }
}
