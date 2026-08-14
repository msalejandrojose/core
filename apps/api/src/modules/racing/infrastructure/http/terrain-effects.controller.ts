import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { ListTerrainEffectsUseCase } from '../../application/use-cases/list-terrain-effects.use-case';
import { TerrainEffectListResponseDto } from './dto/terrain-effect.response.dto';

// De cara al jugador: hace falta hasta sin cuenta, todo el mundo pisa el
// mismo hielo (TASK-304) — separado de AdminTerrainEffectsController, que
// gestiona los factores.
@ApiTags('racing')
@Controller('racing/terrain-effects')
export class TerrainEffectsController {
  constructor(private readonly listEffects: ListTerrainEffectsUseCase) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Factores de terreno de sección (hielo/barro/agua)',
  })
  @ApiOkResponse({ type: TerrainEffectListResponseDto })
  async list(): Promise<TerrainEffectListResponseDto> {
    return TerrainEffectListResponseDto.fromDomain(
      await this.listEffects.execute(),
    );
  }
}
