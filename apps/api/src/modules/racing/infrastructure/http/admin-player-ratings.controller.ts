import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { PaginationQueryDto } from '../../../../shared/http/dto/pagination-query.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminListPlayerRatingsUseCase } from '../../application/use-cases/admin-list-player-ratings.use-case';
import { AdminPlayerRatingListEntryResponseDto } from './dto/admin-player-rating-list-entry.response.dto';

// Ranking de rating de la fase online real, de cara al backoffice
// (TASK-323, tarea 8) — mismo permiso que la configuración de matchmaking:
// en el backoffice viven en la misma página, son la misma sección para
// quien administra.
@ApiTags('racing-admin')
@Controller('admin/racing/player-ratings')
export class AdminPlayerRatingsController {
  constructor(private readonly listRatings: AdminListPlayerRatingsUseCase) {}

  @Get()
  @RequiresPermission('racing.matchmaking_config', 'READ')
  @ApiPaginatedResponse(AdminPlayerRatingListEntryResponseDto)
  async list(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<AdminPlayerRatingListEntryResponseDto>> {
    const { items, total } = await this.listRatings.execute({
      page: query.page,
      limit: query.limit,
    });
    return PaginatedResponseDto.of(
      items.map((e) => AdminPlayerRatingListEntryResponseDto.fromEntry(e)),
      total,
      query.page,
      query.limit,
    );
  }
}
