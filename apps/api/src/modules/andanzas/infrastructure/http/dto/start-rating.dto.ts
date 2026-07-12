import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { type Sentiment } from '../../../domain/ranking/sentiment-band';

const SENTIMENTS: Sentiment[] = ['DISLIKED', 'NEUTRAL', 'LIKED'];

export class StartRatingDto {
  @ApiProperty({
    enum: SENTIMENTS,
    description: 'Sentimiento grueso: decide la banda de nota antes de comparar.',
  })
  @IsIn(SENTIMENTS)
  sentiment!: Sentiment;
}
