import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { DaySummary } from '../../../application/use-cases/get-day-summary.use-case';
import { ActivitySessionResponseDto } from './activity-session.response.dto';
import { MealEntryResponseDto } from './meal-entry.response.dto';

export class DayTotalsDto {
  @ApiProperty({ example: 1840, description: 'kcal ingeridas.' }) kcalIn: number;
  @ApiProperty({ example: 336, description: 'kcal gastadas en actividad.' })
  kcalBurned: number;
  @ApiPropertyOptional({ example: 2209, description: 'Objetivo de ese día.' })
  kcalTarget: number | null;
  @ApiPropertyOptional({
    example: 705,
    description:
      'kcal que quedan: objetivo − ingeridas + gastadas. null sin objetivo.',
  })
  kcalRemaining: number | null;
  @ApiProperty({ example: 92 }) proteinG: number;
  @ApiProperty({ example: 180 }) carbsG: number;
  @ApiProperty({ example: 61 }) fatG: number;
  @ApiPropertyOptional({ example: 80.4 }) weightKg: number | null;
}

export class DaySummaryResponseDto {
  @ApiProperty({ example: '2026-11-10' }) day: string;
  @ApiProperty({ type: DayTotalsDto }) totals: DayTotalsDto;
  @ApiProperty({ type: [MealEntryResponseDto] }) meals: MealEntryResponseDto[];
  @ApiProperty({ type: [ActivitySessionResponseDto] })
  sessions: ActivitySessionResponseDto[];

  static from(s: DaySummary): DaySummaryResponseDto {
    const totals = new DayTotalsDto();
    totals.kcalIn = s.log.kcalIn;
    totals.kcalBurned = s.log.kcalBurned;
    totals.kcalTarget = s.log.kcalTarget;
    // El "restante" se calcula aquí, en la capa HTTP: es presentación de los
    // totales, no un dato que haya que almacenar ni volver a derivar en el
    // cliente.
    totals.kcalRemaining =
      s.log.kcalTarget === null
        ? null
        : s.log.kcalTarget - s.log.kcalIn + s.log.kcalBurned;
    totals.proteinG = s.log.proteinG;
    totals.carbsG = s.log.carbsG;
    totals.fatG = s.log.fatG;
    totals.weightKg = s.log.weightKg;

    const dto = new DaySummaryResponseDto();
    dto.day = s.day;
    dto.totals = totals;
    dto.meals = s.meals.map(MealEntryResponseDto.from);
    dto.sessions = s.sessions.map(ActivitySessionResponseDto.from);
    return dto;
  }
}
