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
import { CreateFoodDto } from './dto/create-food.dto';
import { FoodResponseDto } from './dto/food.response.dto';
import { LogMealDto } from './dto/log-meal.dto';
import { MealEntryResponseDto } from './dto/meal-entry.response.dto';
import { SearchFoodsQueryDto } from './dto/queries.dto';

@ApiTags('nutre')
@Auth()
@Controller('nutre')
export class NutreNutritionController {
  constructor(
    private readonly searchFoods: SearchFoodsUseCase,
    private readonly createFood: CreateFoodUseCase,
    private readonly logMeal: LogMealEntryUseCase,
    private readonly deleteMeal: DeleteMealEntryUseCase,
  ) {}

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
    return foods.map(FoodResponseDto.from);
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
  @ApiNotFoundResponse({ description: 'NUTRE_FOOD_NOT_FOUND.' })
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
  @ApiNotFoundResponse({ description: 'NUTRE_MEAL_ENTRY_NOT_FOUND.' })
  async removeMeal(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteMeal.execute(id, current.sub);
  }
}
