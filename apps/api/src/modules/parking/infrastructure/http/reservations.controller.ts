import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { CancelReservationUseCase } from '../../application/use-cases/cancel-reservation.use-case';
import { ConfirmReservationUseCase } from '../../application/use-cases/confirm-reservation.use-case';
import { CreateReservationUseCase } from '../../application/use-cases/create-reservation.use-case';
import { CreateReservationCheckoutUseCase } from '../../application/use-cases/create-reservation-checkout.use-case';
import { GetReservationUseCase } from '../../application/use-cases/get-reservation.use-case';
import { GetReservationPaymentUseCase } from '../../application/use-cases/get-reservation-payment.use-case';
import { ListHostReservationsUseCase } from '../../application/use-cases/list-host-reservations.use-case';
import { ListMyReservationsUseCase } from '../../application/use-cases/list-my-reservations.use-case';
import { CreateReviewUseCase } from '../../application/use-cases/create-review.use-case';
import { ListReservationReviewsUseCase } from '../../application/use-cases/list-reservation-reviews.use-case';
import { CheckoutResponseDto } from './dto/checkout.response.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { ListHostReservationsQueryDto } from './dto/list-host-reservations.query.dto';
import { ListMyReservationsQueryDto } from './dto/list-my-reservations.query.dto';
import { PaymentResponseDto } from './dto/payment.response.dto';
import { ReservationResponseDto } from './dto/reservation.response.dto';
import { ReviewResponseDto } from './dto/review.response.dto';

// Reservas del usuario autenticado, tanto como guest (reservas que hace)
// como host (reservas que recibe en sus plazas). Scoped a `current.sub` en
// ambos roles, mismo patrón que `me/parkings`.
@ApiTags('me/reservations')
@Auth()
@Controller('me/reservations')
export class ReservationsController {
  constructor(
    private readonly createReservation: CreateReservationUseCase,
    private readonly getReservation: GetReservationUseCase,
    private readonly listMyReservations: ListMyReservationsUseCase,
    private readonly listHostReservations: ListHostReservationsUseCase,
    private readonly confirmReservation: ConfirmReservationUseCase,
    private readonly cancelReservation: CancelReservationUseCase,
    private readonly createReservationCheckout: CreateReservationCheckoutUseCase,
    private readonly getReservationPayment: GetReservationPaymentUseCase,
    private readonly createReview: CreateReviewUseCase,
    private readonly listReservationReviews: ListReservationReviewsUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Reservar una plaza para un rango de fechas' })
  @ApiCreatedResponse({ type: ReservationResponseDto })
  async create(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: CreateReservationDto,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.createReservation.execute({
      parkingId: dto.parkingId,
      guestUserId: current.sub,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
    });
    return ReservationResponseDto.fromDomain(reservation);
  }

  @Get()
  @ApiOperation({ summary: 'Listar mis reservas (como guest)' })
  @ApiCursorPaginatedResponse(ReservationResponseDto)
  async listMine(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: ListMyReservationsQueryDto,
  ): Promise<CursorPaginatedResponseDto<ReservationResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listMyReservations.execute({
      guestUserId: current.sub,
      limit,
      cursor: query.cursor,
      status: query.status,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((r) => ReservationResponseDto.fromDomain(r)),
      page.nextCursor,
      limit,
    );
  }

  // --- Como host (declarado antes de `:id` para no colisionar con la ruta) ---

  @Get('hosting')
  @ApiOperation({
    summary: 'Listar reservas recibidas en mis plazas (como host)',
  })
  @ApiCursorPaginatedResponse(ReservationResponseDto)
  async listHosting(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: ListHostReservationsQueryDto,
  ): Promise<CursorPaginatedResponseDto<ReservationResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listHostReservations.execute({
      hostUserId: current.sub,
      limit,
      cursor: query.cursor,
      status: query.status,
      parkingId: query.parkingId,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((r) => ReservationResponseDto.fromDomain(r)),
      page.nextCursor,
      limit,
    );
  }

  // --- Recurso individual ---

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una reserva (como guest o como host)' })
  @ApiOkResponse({ type: ReservationResponseDto })
  async get(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.getReservation.execute(id, current.sub);
    return ReservationResponseDto.fromDomain(reservation);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirmar una reserva pendiente (solo el host)' })
  @ApiOkResponse({ type: ReservationResponseDto })
  async confirm(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.confirmReservation.execute(id, current.sub);
    return ReservationResponseDto.fromDomain(reservation);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una reserva (guest o host)' })
  @ApiOkResponse({ type: ReservationResponseDto })
  async cancel(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReservationResponseDto> {
    const reservation = await this.cancelReservation.execute(id, current.sub);
    return ReservationResponseDto.fromDomain(reservation);
  }

  @Post(':id/checkout')
  @ApiOperation({
    summary: 'Iniciar el cobro de la reserva (Stripe Checkout, solo el guest)',
  })
  @ApiCreatedResponse({ type: CheckoutResponseDto })
  async checkout(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CheckoutResponseDto> {
    const checkout = await this.createReservationCheckout.execute(
      id,
      current.sub,
    );
    return CheckoutResponseDto.fromDomain(checkout);
  }

  @Get(':id/payment')
  @ApiOperation({ summary: 'Estado del pago de una reserva (guest o host)' })
  @ApiOkResponse({ type: PaymentResponseDto })
  async payment(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.getReservationPayment.execute(id, current.sub);
    return PaymentResponseDto.fromDomain(payment);
  }

  @Post(':id/reviews')
  @ApiOperation({
    summary:
      'Dejar una reseña tras la estancia (guest sobre la plaza, host sobre el guest)',
  })
  @ApiCreatedResponse({ type: ReviewResponseDto })
  async addReview(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.createReview.execute({
      reservationId: id,
      authorUserId: current.sub,
      rating: dto.rating,
      comment: dto.comment ?? null,
    });
    return ReviewResponseDto.fromDomain(review);
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Reseñas de una reserva (guest o host)' })
  @ApiOkResponse({ type: [ReviewResponseDto] })
  async getReviews(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReviewResponseDto[]> {
    const reviews = await this.listReservationReviews.execute(id, current.sub);
    return reviews.map((r) => ReviewResponseDto.fromDomain(r));
  }
}
