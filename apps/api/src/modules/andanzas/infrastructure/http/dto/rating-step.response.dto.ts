import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RatingStepResult } from '../../../application/use-cases/rating-flow.helper';
import { SiteEntryResponseDto } from './site-entry.response.dto';

export class RatingStepResponseDto {
  @ApiProperty({
    description: 'true: ya se calculó la nota final. false: hay que comparar.',
  })
  done!: boolean;

  @ApiPropertyOptional({ type: SiteEntryResponseDto, nullable: true })
  siteEntry!: SiteEntryResponseDto | null;

  @ApiPropertyOptional({ nullable: true, description: 'Eco para el siguiente POST .../rating/answer.' })
  lo!: number | null;

  @ApiPropertyOptional({ nullable: true, description: 'Eco para el siguiente POST .../rating/answer.' })
  hi!: number | null;

  @ApiPropertyOptional({
    nullable: true,
    format: 'uuid',
    description: 'Sitio contra el que comparar en el siguiente paso.',
  })
  compareWithSiteId!: string | null;

  static fromResult(result: RatingStepResult): RatingStepResponseDto {
    const dto = new RatingStepResponseDto();
    dto.done = result.done;
    if (result.done) {
      dto.siteEntry = SiteEntryResponseDto.fromEntry(result.entry);
      dto.lo = null;
      dto.hi = null;
      dto.compareWithSiteId = null;
    } else {
      dto.siteEntry = null;
      dto.lo = result.lo;
      dto.hi = result.hi;
      dto.compareWithSiteId = result.compareWithSiteId;
    }
    return dto;
  }
}
