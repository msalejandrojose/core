import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { SearchFoodsUseCase } from '../../application/use-cases/search-foods.use-case';
import { CreateFoodUseCase } from '../../application/use-cases/create-food.use-case';
import { LogMealEntryUseCase } from '../../application/use-cases/log-meal-entry.use-case';
import { DeleteMealEntryUseCase } from '../../application/use-cases/delete-meal-entry.use-case';
import { GetMealHabitsUseCase } from '../../application/use-cases/get-meal-habits.use-case';
import { MealHabitsResponseDto } from './dto/meal-habits.response.dto';
import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food.response.dto';
import { LogMealDto } from './dto/log-meal.dto';
import { MealEntryResponseDto } from './dto/meal-entry.response.dto';
import { MealHabitsQueryDto, SearchFoodsQueryDto } from './dto/queries.dto';

@ApiTags('brio')
@Auth()
@Controller('brio')
export class BrioNutritionController {
  constructor(
    private readonly searchFoods: SearchFoodsUseCase,
    private readonly createFood: CreateFoodUseCase,
    private readonly logMeal: LogMealEntryUseCase,
    private readonly deleteMeal: DeleteMealEntryUseCase,
    private readonly mealHabits: GetMealHabitsUseCase,
  ) {}

  @Get('meals/habits')
  @ApiOperation({
    summary:
      'Lo de siempre, frecuentes y recientes de un momento del día (últimos 90 días).',
  })
  @ApiOkResponse({ type: MealHabitsResponseDto })
  async habits(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: MealHabitsQueryDto,
  ): Promise<MealHabitsResponseDto> {
    const habits = await this.mealHabits.execute(current.sub, query.mealType);
    return MealHabitsResponseDto.from(habits);
  }

  @Get('foods')
  @ApiOperation({
    summary: 'Buscar alimentos por texto o por código de barras.',
  })
  @ApiOkResponse({ type: [FoodResponseDto] })
  async foods(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: SearchFoodsQueryDto,
  ): Promise<FoodResponseDto[]> {
    const foods = await this.searchFoods.execute({
      userId: current.sub,
      query: query.q,
      barcode: query.barcode,
      limit: query.limit,
    });
    return foods.map((item) => FoodResponseDto.from(item));
  }

  @Post('foods')
  @ApiOperation({ summary: 'Crear un alimento propio (solo lo veo yo).' })
  @ApiCreatedResponse({ type: FoodResponseDto })
  async newFood(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: CreateFoodDto,
  ): Promise<FoodResponseDto> {
    const food = await this.createFood.execute({
      ownerUserId: current.sub,
      name: body.name,
      brand: body.brand ?? null,
      barcode: body.barcode ?? null,
      isLiquid: body.isLiquid ?? false,
      kcalPer100: body.kcalPer100,
      proteinPer100G: body.proteinPer100G,
      carbsPer100G: body.carbsPer100G,
      fatPer100G: body.fatPer100G,
      servings: (body.servings ?? []).map((s) => ({
        label: s.label,
        grams: s.grams,
        isDefault: s.isDefault ?? false,
      })),
    });
    return FoodResponseDto.from(food);
  }

  @Post('meals')
  @ApiOperation({
    summary: 'Registrar comida (del catálogo o rápida) y refrescar el día.',
  })
  @ApiCreatedResponse({ type: MealEntryResponseDto })
  @ApiNotFoundResponse({ description: 'BRIO_FOOD_NOT_FOUND.' })
  async meal(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: LogMealDto,
  ): Promise<MealEntryResponseDto> {
    const entry = await this.logMeal.execute({
      userId: current.sub,
      loggedOn: body.loggedOn,
      mealType: body.mealType,
      foodId: body.foodId,
      servingId: body.servingId,
      quantity: body.quantity,
      customName: body.customName,
      kcal: body.kcal,
      proteinG: body.proteinG,
      carbsG: body.carbsG,
      fatG: body.fatG,
    });
    return MealEntryResponseDto.from(entry);
  }

  @Delete('meals/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar una entrada de mi diario.' })
  @ApiNoContentResponse({ description: 'Entrada borrada.' })
  @ApiNotFoundResponse({ description: 'BRIO_MEAL_ENTRY_NOT_FOUND.' })
  async removeMeal(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteMeal.execute(id, current.sub);
  }
}
