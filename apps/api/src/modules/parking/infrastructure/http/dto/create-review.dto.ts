import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { REVIEW_MAX_RATING, REVIEW_MIN_RATING } from '@core/shared-types';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Body de `POST /me/reservations/:id/reviews`. */
export class CreateReviewDto {
  @ApiProperty({ minimum: REVIEW_MIN_RATING, maximum: REVIEW_MAX_RATING })
  @IsInt()
  @Min(REVIEW_MIN_RATING)
  @Max(REVIEW_MAX_RATING)
  rating: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
