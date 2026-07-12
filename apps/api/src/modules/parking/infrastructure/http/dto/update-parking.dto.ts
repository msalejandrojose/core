import { ApiPropertyOptional } from '@nestjs/swagger';
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

/** Body de edición de una plaza (`PATCH /me/parkings/:id`). No toca `status`. */
export class UpdateParkingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional() @IsOptional() @IsLatitude() latitude?: number;

  @ApiPropertyOptional() @IsOptional() @IsLongitude() longitude?: number;

  @ApiPropertyOptional() @IsOptional() @IsUUID() postalCodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerDay?: number;
}
