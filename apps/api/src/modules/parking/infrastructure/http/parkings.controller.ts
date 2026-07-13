import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { FileViewTokenService } from '../../../storage/infrastructure/http/file-view-token.service';
import { AddParkingPhotoUseCase } from '../../application/use-cases/add-parking-photo.use-case';
import { AddParkingPriceOverrideUseCase } from '../../application/use-cases/add-parking-price-override.use-case';
import { CreateParkingUseCase } from '../../application/use-cases/create-parking.use-case';
import { GetParkingUseCase } from '../../application/use-cases/get-parking.use-case';
import { ListMyParkingsUseCase } from '../../application/use-cases/list-my-parkings.use-case';
import { ListParkingPriceOverridesUseCase } from '../../application/use-cases/list-parking-price-overrides.use-case';
import { PublishParkingUseCase } from '../../application/use-cases/publish-parking.use-case';
import { RemoveParkingPhotoUseCase } from '../../application/use-cases/remove-parking-photo.use-case';
import { RemoveParkingPriceOverrideUseCase } from '../../application/use-cases/remove-parking-price-override.use-case';
import { UnpublishParkingUseCase } from '../../application/use-cases/unpublish-parking.use-case';
import { UpdateParkingUseCase } from '../../application/use-cases/update-parking.use-case';
import { AddParkingPhotoDto } from './dto/add-parking-photo.dto';
import { AddParkingPriceOverrideDto } from './dto/add-parking-price-override.dto';
import { CreateParkingDto } from './dto/create-parking.dto';
import { ListMyParkingsQueryDto } from './dto/list-my-parkings.query.dto';
import { ParkingResponseDto } from './dto/parking.response.dto';
import { ParkingPriceOverrideResponseDto } from './dto/parking-price-override.response.dto';
import { UpdateParkingDto } from './dto/update-parking.dto';

// CRUD de plazas del host autenticado. Todo va scopeado a `current.sub`: un
// host solo ve/edita sus propias plazas (mismo patrón que `me/devices`).
@ApiTags('me/parkings')
@Auth()
@Controller('me/parkings')
export class ParkingsController {
  constructor(
    private readonly createParking: CreateParkingUseCase,
    private readonly updateParking: UpdateParkingUseCase,
    private readonly getParking: GetParkingUseCase,
    private readonly listMyParkings: ListMyParkingsUseCase,
    private readonly publishParking: PublishParkingUseCase,
    private readonly unpublishParking: UnpublishParkingUseCase,
    private readonly addParkingPhoto: AddParkingPhotoUseCase,
    private readonly removeParkingPhoto: RemoveParkingPhotoUseCase,
    private readonly addParkingPriceOverride: AddParkingPriceOverrideUseCase,
    private readonly removeParkingPriceOverride: RemoveParkingPriceOverrideUseCase,
    private readonly listParkingPriceOverrides: ListParkingPriceOverridesUseCase,
    private readonly viewTokens: FileViewTokenService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis plazas' })
  @ApiCursorPaginatedResponse(ParkingResponseDto)
  async list(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: ListMyParkingsQueryDto,
  ): Promise<CursorPaginatedResponseDto<ParkingResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listMyParkings.execute({
      hostUserId: current.sub,
      limit,
      cursor: query.cursor,
      status: query.status,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((p) => ParkingResponseDto.fromDomain(p, this.viewTokens)),
      page.nextCursor,
      limit,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Crear una plaza (nace en DRAFT)' })
  @ApiCreatedResponse({ type: ParkingResponseDto })
  async create(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: CreateParkingDto,
  ): Promise<ParkingResponseDto> {
    const parking = await this.createParking.execute({
      hostUserId: current.sub,
      ...dto,
    });
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una de mis plazas' })
  @ApiOkResponse({ type: ParkingResponseDto })
  async get(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParkingResponseDto> {
    const parking = await this.getParking.execute(id, current.sub);
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar una de mis plazas' })
  @ApiOkResponse({ type: ParkingResponseDto })
  async update(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParkingDto,
  ): Promise<ParkingResponseDto> {
    const parking = await this.updateParking.execute(id, current.sub, dto);
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publicar una plaza' })
  @ApiOkResponse({ type: ParkingResponseDto })
  async publish(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParkingResponseDto> {
    const parking = await this.publishParking.execute(id, current.sub);
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'Despublicar una plaza' })
  @ApiOkResponse({ type: ParkingResponseDto })
  async unpublish(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParkingResponseDto> {
    const parking = await this.unpublishParking.execute(id, current.sub);
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: 'Adjuntar una foto ya subida (storage) a la plaza' })
  @ApiCreatedResponse({ type: ParkingResponseDto })
  async addPhoto(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddParkingPhotoDto,
  ): Promise<ParkingResponseDto> {
    const parking = await this.addParkingPhoto.execute(
      id,
      current.sub,
      dto.storedFileId,
    );
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Delete(':id/photos/:photoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quitar una foto de la galería de la plaza' })
  @ApiOkResponse({ type: ParkingResponseDto })
  async removePhoto(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('photoId', ParseUUIDPipe) photoId: string,
  ): Promise<ParkingResponseDto> {
    const parking = await this.removeParkingPhoto.execute(
      id,
      current.sub,
      photoId,
    );
    return ParkingResponseDto.fromDomain(parking, this.viewTokens);
  }

  @Get(':id/price-overrides')
  @ApiOperation({
    summary: 'Listar los precios especiales por fecha de una de mis plazas',
  })
  @ApiOkResponse({ type: [ParkingPriceOverrideResponseDto] })
  async listPriceOverrides(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ParkingPriceOverrideResponseDto[]> {
    const overrides = await this.listParkingPriceOverrides.execute(
      id,
      current.sub,
    );
    return overrides.map((o) => ParkingPriceOverrideResponseDto.fromDomain(o));
  }

  @Post(':id/price-overrides')
  @ApiOperation({
    summary:
      'Definir un precio distinto al base para un rango de fechas (picos de demanda/eventos)',
  })
  @ApiCreatedResponse({ type: ParkingPriceOverrideResponseDto })
  async addPriceOverride(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddParkingPriceOverrideDto,
  ): Promise<ParkingPriceOverrideResponseDto> {
    const override = await this.addParkingPriceOverride.execute({
      parkingId: id,
      hostUserId: current.sub,
      startDate: new Date(dto.startDate),
      endDate: new Date(dto.endDate),
      pricePerDay: dto.pricePerDay,
      label: dto.label ?? null,
    });
    return ParkingPriceOverrideResponseDto.fromDomain(override);
  }

  @Delete(':id/price-overrides/:overrideId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar un precio especial de la plaza' })
  async removePriceOverride(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('overrideId', ParseUUIDPipe) overrideId: string,
  ): Promise<void> {
    await this.removeParkingPriceOverride.execute(id, current.sub, overrideId);
  }
}
