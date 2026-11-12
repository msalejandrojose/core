import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import type { CardioAnalysis } from '../../domain/services/performance/cardio-engine';
import type { FatigueAnalysis } from '../../domain/services/performance/fatigue-engine';
import type { HybridAnalysis } from '../../domain/services/performance/hybrid-engine';
import type { MuscleAnalysisResult } from '../../domain/services/performance/muscle-engine';
import type { StrengthAnalysis } from '../../domain/services/performance/strength-engine';
import { GetCardioAnalysisUseCase } from '../../application/use-cases/get-cardio-analysis.use-case';
import { GetFatigueAnalysisUseCase } from '../../application/use-cases/get-fatigue-analysis.use-case';
import { GetHybridAnalysisUseCase } from '../../application/use-cases/get-hybrid-analysis.use-case';
import { GetMuscleAnalysisUseCase } from '../../application/use-cases/get-muscle-analysis.use-case';
import { GetStrengthAnalysisUseCase } from '../../application/use-cases/get-strength-analysis.use-case';
import { PerformancePeriodQueryDto } from './dto/performance-inputs.dto';

// Resultados de los motores de rendimiento. Todo se calcula al vuelo con
// algoritmos deterministas sobre lo que el usuario ha registrado.
@ApiTags('ritmo')
@Auth()
@Controller('ritmo/performance')
export class RitmoPerformanceController {
  constructor(
    private readonly strengthAnalysis: GetStrengthAnalysisUseCase,
    private readonly muscleAnalysis: GetMuscleAnalysisUseCase,
    private readonly cardioAnalysis: GetCardioAnalysisUseCase,
    private readonly fatigueAnalysis: GetFatigueAnalysisUseCase,
    private readonly hybridAnalysis: GetHybridAnalysisUseCase,
  ) {}

  @Get('strength')
  @ApiOperation({
    summary:
      'Fuerza por ejercicio: e1RM estimado, marcas, volumen y estancamiento.',
  })
  @ApiOkResponse({ description: 'Análisis de fuerza por ejercicio.' })
  strength(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<StrengthAnalysis> {
    return this.strengthAnalysis.execute(current.sub);
  }

  @Get('muscles')
  @ApiOperation({
    summary:
      'Carga de entrenamiento por grupo muscular (datos del mapa muscular).',
  })
  @ApiOkResponse({
    description: 'Series, volumen, frecuencia y tendencia por músculo.',
  })
  muscles(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<MuscleAnalysisResult> {
    return this.muscleAnalysis.execute(current.sub);
  }

  @Get('cardio')
  @ApiOperation({
    summary:
      'Cardio: zonas, eficiencia, evolución, predicción de marcas, VO2max y umbral.',
  })
  @ApiOkResponse({
    description: 'Análisis cardiovascular. Distingue lo medido de lo estimado.',
  })
  cardio(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: PerformancePeriodQueryDto,
  ): Promise<CardioAnalysis> {
    return this.cardioAnalysis.execute(current.sub, query.period ?? '30d');
  }

  @Get('fatigue')
  @ApiOperation({
    summary:
      'Carga acumulada: Session RPE, TRIMP, reciente contra habitual y descanso.',
  })
  @ApiOkResponse({
    description:
      'Indicadores de carga. No predicen lesiones ni miden la recuperación.',
  })
  fatigue(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<FatigueAnalysis> {
    return this.fatigueAnalysis.execute(current.sub);
  }

  @Get('hybrid')
  @ApiOperation({
    summary:
      'Fuerza y cardio juntos: equilibrio, tren inferior, interferencia y evolución.',
  })
  @ApiOkResponse({
    description: 'Análisis híbrido. Las relaciones son correlaciones.',
  })
  hybrid(@CurrentUser() current: AccessTokenPayload): Promise<HybridAnalysis> {
    return this.hybridAnalysis.execute(current.sub);
  }
}
