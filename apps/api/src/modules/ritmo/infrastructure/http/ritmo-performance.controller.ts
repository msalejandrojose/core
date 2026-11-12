import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import type { MuscleAnalysisResult } from '../../domain/services/performance/muscle-engine';
import type { StrengthAnalysis } from '../../domain/services/performance/strength-engine';
import { GetMuscleAnalysisUseCase } from '../../application/use-cases/get-muscle-analysis.use-case';
import { GetStrengthAnalysisUseCase } from '../../application/use-cases/get-strength-analysis.use-case';

// Resultados de los motores de rendimiento. Todo se calcula al vuelo con
// algoritmos deterministas sobre lo que el usuario ha registrado.
@ApiTags('ritmo')
@Auth()
@Controller('ritmo/performance')
export class RitmoPerformanceController {
  constructor(
    private readonly strengthAnalysis: GetStrengthAnalysisUseCase,
    private readonly muscleAnalysis: GetMuscleAnalysisUseCase,
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
}
