import { ApiProperty } from '@nestjs/swagger';
import { REVIEW_AUTHOR_ROLES, type ReviewAuthorRole } from '@core/shared-types';
import { type Review } from '../../../domain/entities/review.entity';

export class ReviewResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() reservationId: string;
  @ApiProperty() authorUserId: string;
  @ApiProperty({ enum: REVIEW_AUTHOR_ROLES }) authorRole: ReviewAuthorRole;
  @ApiProperty() rating: number;
  @ApiProperty({ type: String, nullable: true }) comment: string | null;
  @ApiProperty() createdAt: Date;

  static fromDomain(review: Review): ReviewResponseDto {
    const dto = new ReviewResponseDto();
    dto.id = review.id;
    dto.reservationId = review.reservationId;
    dto.authorUserId = review.authorUserId;
    dto.authorRole = review.authorRole;
    dto.rating = review.rating;
    dto.comment = review.comment;
    dto.createdAt = review.createdAt;
    return dto;
  }
}
