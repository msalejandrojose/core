import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { FileViewTokenService } from '../../../storage/infrastructure/http/file-view-token.service';
import { GetParkingPriceQuoteUseCase } from '../../application/use-cases/get-parking-price-quote.use-case';
import { GetPublicParkingUseCase } from '../../application/use-cases/get-public-parking.use-case';
import { ListParkingReviewsUseCase } from '../../application/use-cases/list-parking-reviews.use-case';
import { SearchPublicParkingsUseCase } from '../../application/use-cases/search-public-parkings.use-case';
import { ParkingPriceQuoteQueryDto } from './dto/parking-price-quote.query.dto';
import { ParkingPriceQuoteResponseDto } from './dto/parking-price-quote.response.dto';
import { ListParkingReviewsQueryDto } from './dto/list-parking-reviews.query.dto';
import {
  PublicParkingResponseDto,
  PublicParkingSummaryResponseDto,
} from './dto/public-parking.response.dto';
import { ReviewResponseDto } from './dto/review.response.dto';
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
    private readonly getParkingPriceQuote: GetParkingPriceQuoteUseCase,
    private readonly listParkingReviews: ListParkingReviewsUseCase,
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
      lat: query.lat,
      lng: query.lng,
      radiusKm: query.radiusKm,
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
    const { parking, hostVerified, rating } =
      await this.getPublicParking.execute(id);
    return PublicParkingResponseDto.fromDomain(
      parking,
      this.viewTokens,
      hostVerified,
      rating,
    );
  }

  @Get('parkings/:id/reviews')
  @ApiOperation({ summary: 'Reseñas del guest sobre una plaza (TASK-154).' })
  @ApiCursorPaginatedResponse(ReviewResponseDto)
  async reviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListParkingReviewsQueryDto,
  ): Promise<CursorPaginatedResponseDto<ReviewResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listParkingReviews.execute({
      parkingId: id,
      limit,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((r) => ReviewResponseDto.fromDomain(r)),
      page.nextCursor,
      limit,
    );
  }

  @Get('parkings/:id/quote')
  @ApiOperation({
    summary:
      'Precio total de una plaza para un rango de fechas (con precios dinámicos aplicados, TASK-146).',
  })
  @ApiOkResponse({ type: ParkingPriceQuoteResponseDto })
  async quote(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ParkingPriceQuoteQueryDto,
  ): Promise<ParkingPriceQuoteResponseDto> {
    const quote = await this.getParkingPriceQuote.execute(
      id,
      new Date(query.startDate),
      new Date(query.endDate),
    );
    return ParkingPriceQuoteResponseDto.fromDomain(quote);
  }
}
