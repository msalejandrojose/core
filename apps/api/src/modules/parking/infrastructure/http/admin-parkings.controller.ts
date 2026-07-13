import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { FileViewTokenService } from '../../../storage/infrastructure/http/file-view-token.service';
import { GetAnyParkingUseCase } from '../../application/use-cases/get-any-parking.use-case';
import { ListAllParkingsUseCase } from '../../application/use-cases/list-all-parkings.use-case';
import { ListAllReservationsUseCase } from '../../application/use-cases/list-all-reservations.use-case';
import { ModerateUnpublishParkingUseCase } from '../../application/use-cases/moderate-unpublish-parking.use-case';
import { UnverifyParkingUseCase } from '../../application/use-cases/unverify-parking.use-case';
import { VerifyParkingUseCase } from '../../application/use-cases/verify-parking.use-case';
import { ListAllParkingsQueryDto } from './dto/list-all-parkings.query.dto';
import { ListAllReservationsQueryDto } from './dto/list-all-reservations.query.dto';
import { ParkingResponseDto } from './dto/parking.response.dto';
import { ReservationResponseDto } from './dto/reservation.response.dto';

// Backoffice: moderación de plazas y visión completa de reservas, sobre
// cualquier host/guest. Protegido por el árbol de permisos (sección
// `parking`), no por propiedad del recurso como `me/parkings`.
@ApiTags('parking-admin')
@Controller('parking/admin')
export class AdminParkingsController {
  constructor(
    private readonly listAllParkings: ListAllParkingsUseCase,
    private readonly getAnyParking: GetAnyParkingUseCase,
    private readonly moderateUnpublish: ModerateUnpublishParkingUseCase,
    private readonly verifyParking: VerifyParkingUseCase,
    private readonly unverifyParking: UnverifyParkingUseCase,
    private readonly listAllReservations: ListAllReservationsUseCase,
    private readonly viewTokens: FileViewTokenService,
  ) {}

  @Get('parkings')
  @RequiresPermission('parking', 'READ')
  @ApiOperation({ summary: 'Listar todas las plazas (cualquier host)' })
  @ApiCursorPaginatedResponse(ParkingResponseDto)
  async listParkings(
    @Query() query: ListAllParkingsQueryDto,
  ): Promise<CursorPaginatedResponseDto<ParkingResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listAllParkings.execute({
      limit,
      cursor: query.cursor,
      status: query.status,
      hostUserId: query.hostUserId,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((p) => ParkingResponseDto.fromDomain(p, this.viewTokens)),
      page.nextCursor,
      limit,
    );
  }

  @Get('parkings/:id')
  @RequiresPermission('parking', 'READ')
  @ApiOperation({ summary: 'Obtener cualquier plaza por id' })
  @ApiOkResponse({ type: ParkingResponseDto })
  async getParking(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParkingResponseDto> {
    const parking = await this.getAnyParking.execute(id);
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Post('parkings/:id/unpublish')
  @RequiresPermission('parking', 'WRITE')
  @ApiOperation({ summary: 'Despublicar cualquier plaza (moderación)' })
  @ApiOkResponse({ type: ParkingResponseDto })
  async unpublishParking(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParkingResponseDto> {
    const parking = await this.moderateUnpublish.execute(id);
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Post('parkings/:id/verify')
  @RequiresPermission('parking', 'WRITE')
  @ApiOperation({
    summary: 'Verificar que una plaza existe de verdad (KYC básico)',
  })
  @ApiOkResponse({ type: ParkingResponseDto })
  async verify(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParkingResponseDto> {
    const parking = await this.verifyParking.execute(id);
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Post('parkings/:id/unverify')
  @RequiresPermission('parking', 'WRITE')
  @ApiOperation({ summary: 'Revocar la verificación de una plaza' })
  @ApiOkResponse({ type: ParkingResponseDto })
  async unverify(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParkingResponseDto> {
    const parking = await this.unverifyParking.execute(id);
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Get('reservations')
  @RequiresPermission('parking', 'READ')
  @ApiOperation({ summary: 'Listar todas las reservas (cualquier guest/host)' })
  @ApiCursorPaginatedResponse(ReservationResponseDto)
  async listReservations(
    @Query() query: ListAllReservationsQueryDto,
  ): Promise<CursorPaginatedResponseDto<ReservationResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listAllReservations.execute({
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
}
