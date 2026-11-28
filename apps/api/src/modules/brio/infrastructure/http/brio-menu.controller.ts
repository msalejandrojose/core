import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { MEALS, type Meal } from '../../domain/services/menu';
import {
  AddPlannedMealUseCase,
  CheckShoppingItemUseCase,
  ClearPlannedMealUseCase,
  GetMenuWeekUseCase,
  GetShoppingListUseCase,
  LogPlannedMealUseCase,
  RemovePlannedMealUseCase,
  SwapMenuDishUseCase,
  type MenuWeek,
  type ShoppingView,
} from '../../application/use-cases/menu.use-cases';
import { MealEntryResponseDto } from './dto/meal-entry.response.dto';
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

/**
 * Algo que se pone en una comida del menú: un alimento o receta del catálogo
 * (`foodId`, con `servingId` y `quantity` opcionales) o, sin catálogo,
 * `customName` + `kcal`.
 */
export class AddPlannedMealDto {
  @ApiPropertyOptional({ description: 'Alimento o receta del catálogo.' })
  @IsOptional()
  @IsUUID()
  foodId?: string;

  @ApiPropertyOptional({
    description:
      'Ración del alimento. Sin ración ni cantidad, se usa la ración por defecto (1 ración en las recetas).',
  })
  @IsOptional()
  @IsUUID()
  servingId?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Raciones si hay `servingId`; si no, gramos.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.25)
  @Max(3000)
  quantity?: number;

  @ApiPropertyOptional({ example: 'Menú del día' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  customName?: string;

  @ApiPropertyOptional({ example: 700 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5000)
  kcal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  proteinG?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  carbsG?: number;
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  fatG?: number;
}

export class LoggedPlannedMealDto {
  @ApiProperty({ type: [MealEntryResponseDto] })
  entries!: MealEntryResponseDto[];
}

function parseDayMeal(day: string, meal: string): Meal {
  if (!DAY_PATTERN.test(day) || Number.isNaN(Date.parse(day)))
    throw new BadRequestException('El día debe tener formato YYYY-MM-DD.');
  const upper = meal.toUpperCase() as Meal;
  if (!MEALS.includes(upper))
    throw new BadRequestException('BRIO_MENU_MEAL_INVALID');
  return upper;
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
    private readonly addPlanned: AddPlannedMealUseCase,
    private readonly removePlanned: RemovePlannedMealUseCase,
    private readonly clearPlanned: ClearPlannedMealUseCase,
    private readonly logPlanned: LogPlannedMealUseCase,
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
    return this.swap.execute(current.sub, day, parseDayMeal(day, meal));
  }

  @Post('menu/:day/:meal/items')
  @ApiOperation({
    summary:
      'Poner un alimento, una receta o algo sin catálogo en una comida de un día (sustituye al plato sugerido).',
  })
  @ApiOkResponse({ description: 'Menú de la semana con lo añadido.' })
  async postItem(
    @CurrentUser() current: AccessTokenPayload,
    @Param('day') day: string,
    @Param('meal') meal: string,
    @Body() dto: AddPlannedMealDto,
  ): Promise<MenuWeek> {
    await this.addPlanned.execute(current.sub, {
      ...dto,
      day,
      meal: parseDayMeal(day, meal),
    });
    return this.menuWeek.execute(current.sub, day);
  }

  @Delete('menu/:day/:meal/items')
  @ApiOperation({
    summary: 'Vaciar una comida de un día: vuelve el plato sugerido.',
  })
  @ApiOkResponse({ description: 'Menú de la semana sin lo planificado ahí.' })
  async deleteMealItems(
    @CurrentUser() current: AccessTokenPayload,
    @Param('day') day: string,
    @Param('meal') meal: string,
  ): Promise<MenuWeek> {
    await this.clearPlanned.execute(current.sub, day, parseDayMeal(day, meal));
    return this.menuWeek.execute(current.sub, day);
  }

  @Delete('menu/items/:id')
  @ApiOperation({ summary: 'Quitar una cosa planificada del menú.' })
  @ApiOkResponse({ description: 'Menú de la semana de `day` (o la actual).' })
  async deleteItem(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id') id: string,
    @Query() query: DayQueryDto,
  ): Promise<MenuWeek> {
    await this.removePlanned.execute(current.sub, id);
    return this.menuWeek.execute(current.sub, query.day);
  }

  @Post('menu/:day/:meal/log')
  @ApiOperation({
    summary:
      'Apuntar en el diario lo que había en el menú para esa comida (lo planificado o el plato sugerido).',
  })
  @ApiOkResponse({ type: LoggedPlannedMealDto })
  async postLog(
    @CurrentUser() current: AccessTokenPayload,
    @Param('day') day: string,
    @Param('meal') meal: string,
  ): Promise<LoggedPlannedMealDto> {
    const entries = await this.logPlanned.execute(
      current.sub,
      day,
      parseDayMeal(day, meal),
    );
    return { entries: entries.map((e) => MealEntryResponseDto.from(e)) };
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
