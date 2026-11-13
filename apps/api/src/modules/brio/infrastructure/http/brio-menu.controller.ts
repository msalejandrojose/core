import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional, Matches } from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { MEALS, type Meal } from '../../domain/services/menu';
import {
  CheckShoppingItemUseCase,
  GetMenuWeekUseCase,
  GetShoppingListUseCase,
  SwapMenuDishUseCase,
  type MenuWeek,
  type ShoppingView,
} from '../../application/use-cases/menu.use-cases';
import { DAY_PATTERN } from './dto/day.param';
import { DayQueryDto } from './dto/queries.dto';

export class CheckItemDto {
  @ApiProperty() @IsBoolean() checked!: boolean;

  @ApiPropertyOptional({
    example: '2026-11-13',
    description: 'Un día de la semana de la lista; por defecto, hoy.',
  })
  @IsOptional()
  @Matches(DAY_PATTERN, { message: 'day debe tener formato YYYY-MM-DD.' })
  day?: string;
}

// Menús y lista de la compra del plan: salen de las calorías de cada día.
@ApiTags('brio')
@Auth()
@Controller('brio/plan')
export class BrioMenuController {
  constructor(
    private readonly menuWeek: GetMenuWeekUseCase,
    private readonly swap: SwapMenuDishUseCase,
    private readonly shopping: GetShoppingListUseCase,
    private readonly check: CheckShoppingItemUseCase,
  ) {}

  @Get('menu')
  @ApiOperation({ summary: 'Mi menú de la semana, ajustado a cada día.' })
  @ApiOkResponse({ description: 'Menú de los siete días.' })
  getMenu(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: DayQueryDto,
  ): Promise<MenuWeek> {
    return this.menuWeek.execute(current.sub, query.day);
  }

  @Post('menu/:day/:meal/swap')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cambiar el plato de una comida por otra opción.' })
  @ApiOkResponse({ description: 'Menú de la semana con el cambio.' })
  postSwap(
    @CurrentUser() current: AccessTokenPayload,
    @Param('day') day: string,
    @Param('meal') meal: string,
  ): Promise<MenuWeek> {
    if (!DAY_PATTERN.test(day) || Number.isNaN(Date.parse(day)))
      throw new BadRequestException('El día debe tener formato YYYY-MM-DD.');
    const upper = meal.toUpperCase() as Meal;
    if (!MEALS.includes(upper))
      throw new BadRequestException('BRIO_MENU_MEAL_INVALID');
    return this.swap.execute(current.sub, day, upper);
  }

  @Get('shopping')
  @ApiOperation({ summary: 'Lista de la compra del menú de la semana.' })
  @ApiOkResponse({ description: 'Productos por pasillo, con lo ya comprado.' })
  getShopping(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: DayQueryDto,
  ): Promise<ShoppingView> {
    return this.shopping.execute(current.sub, query.day);
  }

  @Put('shopping/:code')
  @ApiOperation({ summary: 'Marcar o desmarcar un producto como comprado.' })
  @ApiOkResponse({ description: 'Lista actualizada.' })
  putCheck(
    @CurrentUser() current: AccessTokenPayload,
    @Param('code') code: string,
    @Body() dto: CheckItemDto,
  ): Promise<ShoppingView> {
    return this.check.execute(current.sub, dto.day, code, dto.checked);
  }
}
