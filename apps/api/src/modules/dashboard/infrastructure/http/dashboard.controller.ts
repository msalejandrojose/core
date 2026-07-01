import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { KpiRegistry } from '../../application/kpi-registry.service';
import { GetDashboardStatsUseCase } from '../../application/use-cases/get-dashboard-stats.use-case';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';
import { KpiCatalogResponseDto } from './dto/kpi-catalog.response.dto';
import { KpiSeriesQueryDto, KpiSeriesResponseDto } from './dto/kpi-series.response.dto';
import {
  KpiValueItemDto,
  KpiValuesBatchRequestDto,
  KpiValuesBatchResponseDto,
} from './dto/kpi-values-batch.dto';

const MAX_HOUR_RANGE_DAYS = 7;

@ApiTags('dashboard')
@Auth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getStats: GetDashboardStatsUseCase,
    private readonly kpiRegistry: KpiRegistry,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Métricas agregadas para el dashboard del backoffice.' })
  @ApiOkResponse({ type: DashboardStatsResponseDto })
  async stats(): Promise<DashboardStatsResponseDto> {
    return DashboardStatsResponseDto.from(await this.getStats.execute());
  }

  @Get('kpis')
  @ApiOperation({ summary: 'Catálogo de KPIs disponibles.' })
  @ApiOkResponse({ type: KpiCatalogResponseDto })
  kpiCatalog(): KpiCatalogResponseDto {
    return KpiCatalogResponseDto.from(this.kpiRegistry.getAll());
  }

  @Post('kpis/values')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valor escalar actual para un lote de KPIs.' })
  @ApiOkResponse({ type: KpiValuesBatchResponseDto })
  async kpiValues(@Body() dto: KpiValuesBatchRequestDto): Promise<KpiValuesBatchResponseDto> {
    const results = await Promise.allSettled(
      dto.slugs.map(async (slug) => {
        const def = this.kpiRegistry.get(slug);
        if (!def) throw new Error(`KPI '${slug}' not found`);
        return { slug, value: await def.scalar() };
      }),
    );

    const values: KpiValueItemDto[] = results.map((r, i) => {
      if (r.status === 'fulfilled') {
        return { slug: r.value.slug, value: r.value.value };
      }
      return { slug: dto.slugs[i]!, value: null, error: r.reason?.message ?? 'Unknown error' };
    });

    return { values };
  }

  @Get('kpis/:slug/series')
  @ApiOperation({ summary: 'Serie temporal de un KPI.' })
  @ApiOkResponse({ type: KpiSeriesResponseDto })
  async kpiSeries(
    @Param('slug') slug: string,
    @Query() query: KpiSeriesQueryDto,
  ): Promise<KpiSeriesResponseDto> {
    const def = this.kpiRegistry.get(slug);
    if (!def) throw new NotFoundException(`KPI '${slug}' not found`);
    if (!def.series) {
      throw new UnprocessableEntityException(`KPI '${slug}' does not support time-series`);
    }

    if (query.granularity === 'hour') {
      const diffMs = new Date(query.to).getTime() - new Date(query.from).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays > MAX_HOUR_RANGE_DAYS) {
        throw new UnprocessableEntityException(
          `Granularity 'hour' is only allowed for ranges ≤ ${MAX_HOUR_RANGE_DAYS} days`,
        );
      }
    }

    const points = await def.series({ from: query.from, to: query.to }, query.granularity);

    return {
      slug,
      from: query.from,
      to: query.to,
      granularity: query.granularity,
      points,
    };
  }
}
