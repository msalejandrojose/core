import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ParkingPriceQuoteQueryDto {
  @ApiProperty() @IsDateString() startDate: string;
  @ApiProperty() @IsDateString() endDate: string;
}
