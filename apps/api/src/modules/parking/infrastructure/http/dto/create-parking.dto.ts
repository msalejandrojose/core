import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

/** Body de alta de una plaza (`POST /me/parkings`). Nace en `DRAFT`. */
export class CreateParkingDto {
  @ApiProperty() @IsString() @MaxLength(200) title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty() @IsString() @MaxLength(255) address: string;

  @ApiProperty() @IsLatitude() latitude: number;

  @ApiProperty() @IsLongitude() longitude: number;

  @ApiPropertyOptional() @IsOptional() @IsUUID() postalCodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessInstructions?: string;

  @ApiProperty() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) pricePerDay: number;
}
