import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { FileViewTokenService } from '../../../storage/infrastructure/http/file-view-token.service';
import { GetPublicParkingUseCase } from '../../application/use-cases/get-public-parking.use-case';
import { SearchPublicParkingsUseCase } from '../../application/use-cases/search-public-parkings.use-case';
import {
  PublicParkingResponseDto,
  PublicParkingSummaryResponseDto,
} from './dto/public-parking.response.dto';
import { SearchPublicParkingsQueryDto } from './dto/search-public-parkings.query.dto';

// Buscador y ficha públicos (landing web): sin autenticación, solo plazas
// `PUBLISHED`. Nunca expone datos de host/reservas.
@ApiTags('parking')
@Public()
@Controller('parking/public')
export class PublicParkingsController {
  constructor(
    private readonly searchPublicParkings: SearchPublicParkingsUseCase,
    private readonly getPublicParking: GetPublicParkingUseCase,
    private readonly viewTokens: FileViewTokenService,
  ) {}

  @Get('parkings')
  @ApiOperation({ summary: 'Buscador público de plazas (ubicación + fechas).' })
  @ApiCursorPaginatedResponse(PublicParkingSummaryResponseDto)
  async search(
    @Query() query: SearchPublicParkingsQueryDto,
  ): Promise<CursorPaginatedResponseDto<PublicParkingSummaryResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.searchPublicParkings.execute({
      limit,
      cursor: query.cursor,
      q: query.q,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((p) =>
        PublicParkingSummaryResponseDto.fromDomain(p, this.viewTokens),
      ),
      page.nextCursor,
      limit,
    );
  }

  @Get('parkings/:id')
  @ApiOperation({ summary: 'Ficha pública de una plaza publicada.' })
  @ApiOkResponse({ type: PublicParkingResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicParkingResponseDto> {
    const parking = await this.getPublicParking.execute(id);
    return PublicParkingResponseDto.fromDomain(parking, this.viewTokens);
  }
}
