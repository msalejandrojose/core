import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiProperty,
  ApiPropertyOptional,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  DigestionUseCases,
  type DigestionView,
} from '../../application/use-cases/digestion.use-cases';
import {
  BOWEL_AMOUNTS,
  type BowelAmount,
  type BowelMovement,
  type BristolType,
  type DigestionPeriod,
} from '../../domain/services/digestion';

const PERIODS: DigestionPeriod[] = ['WEEK', 'MONTH', 'YEAR'];

class DigestionQueryDto {
  @ApiPropertyOptional({ enum: PERIODS, default: 'WEEK' })
  @IsOptional()
  @IsIn(PERIODS)
  period?: DigestionPeriod;
}

class LogBowelMovementDto {
  @ApiProperty({
    minimum: 1,
    maximum: 7,
    example: 4,
    description: 'Escala de Bristol.',
  })
  @IsInt()
  @Min(1)
  @Max(7)
  bristolType!: number;

  @ApiProperty({ enum: BOWEL_AMOUNTS, example: 'NORMAL' })
  @IsIn(BOWEL_AMOUNTS)
  amount!: BowelAmount;

  @ApiPropertyOptional({ description: 'Cuándo fue. Por defecto, ahora.' })
  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

@ApiTags('brio')
@Auth()
@Controller('brio/digestion')
export class BrioDigestionController {
  constructor(private readonly digestion: DigestionUseCases) {}

  @Get()
  @ApiOperation({ summary: 'Resumen del periodo y últimas deposiciones.' })
  view(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: DigestionQueryDto,
  ): Promise<DigestionView> {
    return this.digestion.view(current.sub, query.period ?? 'WEEK');
  }

  @Post()
  @ApiOperation({ summary: 'Registrar una deposición (escala de Bristol).' })
  log(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: LogBowelMovementDto,
  ): Promise<BowelMovement> {
    return this.digestion.log(current.sub, {
      bristolType: body.bristolType as BristolType,
      amount: body.amount,
      occurredAt: body.occurredAt ? new Date(body.occurredAt) : undefined,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar una deposición registrada.' })
  async remove(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.digestion.remove(current.sub, id);
  }
}
