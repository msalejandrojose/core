import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsUUID, Min } from 'class-validator';
import { type Sentiment } from '../../../domain/ranking/sentiment-band';

const SENTIMENTS: Sentiment[] = ['DISLIKED', 'NEUTRAL', 'LIKED'];

// El flujo de puntuación es sin estado en servidor: el cliente reenvía en
// cada paso el `sentiment` y el rango `lo`/`hi` que recibió en la respuesta
// anterior (ver StartRatingUseCase / AnswerRatingComparisonUseCase).
export class AnswerRatingComparisonDto {
  @ApiProperty({ enum: SENTIMENTS })
  @IsIn(SENTIMENTS)
  sentiment!: Sentiment;

  @ApiProperty({ description: 'Devuelto en el paso anterior.' })
  @IsInt()
  @Min(0)
  lo!: number;

  @ApiProperty({ description: 'Devuelto en el paso anterior.' })
  @IsInt()
  @Min(0)
  hi!: number;

  @ApiProperty({
    format: 'uuid',
    description: 'El compareWithSiteId devuelto en el paso anterior.',
  })
  @IsUUID()
  compareWithSiteId!: string;

  @ApiProperty({ description: '¿Le gustó más el sitio nuevo que compareWithSiteId?' })
  @IsBoolean()
  newSiteIsBetter!: boolean;
}
