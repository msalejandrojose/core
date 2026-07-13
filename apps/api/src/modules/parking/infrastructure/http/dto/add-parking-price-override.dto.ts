import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/** Body de `POST /me/parkings/:id/price-overrides`. */
export class AddParkingPriceOverrideDto {
  @ApiProperty() @IsDateString() startDate: string;

  @ApiProperty() @IsDateString() endDate: string;

  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) pricePerDay: number;

  @ApiPropertyOptional({ description: 'Ej. "Fin de año", "Concierto".' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
