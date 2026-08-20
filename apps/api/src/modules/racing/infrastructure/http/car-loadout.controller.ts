import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { GetPlayerCarLoadoutUseCase } from '../../application/use-cases/get-player-car-loadout.use-case';
import { ListCarCatalogUseCase } from '../../application/use-cases/list-car-catalog.use-case';
import { PurchaseCarItemUseCase } from '../../application/use-cases/purchase-car-item.use-case';
import { SetPlayerCarLoadoutUseCase } from '../../application/use-cases/set-player-car-loadout.use-case';
import { CarCatalogResponseDto } from './dto/car-catalog.response.dto';
import { PlayerCarLoadoutResponseDto } from './dto/player-car-loadout.response.dto';
import { PurchaseCarItemDto } from './dto/purchase-car-item.dto';
import { SetPlayerCarLoadoutDto } from './dto/set-player-car-loadout.dto';
import { WalletResponseDto } from './dto/wallet.response.dto';

// De cara al jugador: consultar el catálogo (arquetipos/piezas activos) y su
// propia configuración, y cambiar lo que lleva equipado. Separado de los
// controllers admin/racing/car-*, que gestionan el catálogo (TASK-266).
@ApiTags('racing')
@Auth()
@Controller('racing/cars')
export class CarLoadoutController {
  constructor(
    private readonly listCatalog: ListCarCatalogUseCase,
    private readonly getLoadout: GetPlayerCarLoadoutUseCase,
    private readonly setLoadout: SetPlayerCarLoadoutUseCase,
    private readonly purchaseItem: PurchaseCarItemUseCase,
  ) {}

  @Get('catalog')
  @ApiOperation({
    summary: 'Arquetipos, piezas y skins disponibles',
    description:
      'Cada skin indica si el jugador que consulta lo tiene desbloqueado (owned).',
  })
  @ApiOkResponse({ type: CarCatalogResponseDto })
  async catalog(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<CarCatalogResponseDto> {
    return CarCatalogResponseDto.fromDomain(
      await this.listCatalog.execute(current.sub),
    );
  }

  @Get('me')
  @ApiOperation({
    summary: 'Configuración de coche actual',
    description:
      'Si el jugador nunca ha cambiado nada, devuelve el arquetipo por defecto sin piezas.',
  })
  @ApiOkResponse({ type: PlayerCarLoadoutResponseDto })
  async me(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<PlayerCarLoadoutResponseDto> {
    const result = await this.getLoadout.execute(current.sub);
    return PlayerCarLoadoutResponseDto.fromDomain(result);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Equipar arquetipo y piezas',
    description:
      'archetypeId es obligatorio. Un hueco de pieza ausente en el body no se toca; null lo vacía.',
  })
  @ApiOkResponse({ type: PlayerCarLoadoutResponseDto })
  async setMe(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: SetPlayerCarLoadoutDto,
  ): Promise<PlayerCarLoadoutResponseDto> {
    await this.setLoadout.execute(current.sub, {
      archetypeId: dto.archetypeId,
      tiresPartId: dto.tiresPartId,
      wingPartId: dto.wingPartId,
      chassisPartId: dto.chassisPartId,
      skinId: dto.skinId,
    });
    const result = await this.getLoadout.execute(current.sub);
    return PlayerCarLoadoutResponseDto.fromDomain(result);
  }

  @Post('shop/purchase')
  @ApiOperation({
    summary: 'Comprar un arquetipo, pieza o skin con monedas (TASK-320)',
    description:
      'Descuenta el saldo y da la propiedad — rechaza si no llega el saldo (402), si ya lo tienes (409) o si no está a la venta (409). No lo equipa: eso sigue siendo un PATCH /racing/cars/me aparte.',
  })
  @ApiOkResponse({ type: WalletResponseDto })
  async purchase(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: PurchaseCarItemDto,
  ): Promise<WalletResponseDto> {
    const balance = await this.purchaseItem.execute({
      userId: current.sub,
      itemType: dto.itemType,
      itemId: dto.itemId,
    });
    return WalletResponseDto.fromBalance(balance);
  }
}
