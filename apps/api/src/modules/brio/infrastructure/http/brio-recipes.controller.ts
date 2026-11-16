import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { CreateRecipeUseCase } from '../../application/use-cases/create-recipe.use-case';
import { ListRecipesUseCase } from '../../application/use-cases/list-recipes.use-case';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { FoodResponseDto } from './dto/food.response.dto';

/**
 * Recetas: se guardan como alimento propio con su ración «1 ración», así que
 * se apuntan igual que cualquier otro alimento.
 */
@ApiTags('brio')
@Auth()
@Controller('brio/recipes')
export class BrioRecipesController {
  constructor(
    private readonly createRecipe: CreateRecipeUseCase,
    private readonly listRecipes: ListRecipesUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Mis recetas, las más nuevas primero.' })
  @ApiOkResponse({ type: [FoodResponseDto] })
  async list(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<FoodResponseDto[]> {
    const foods = await this.listRecipes.execute(current.sub);
    return foods.map((f) => FoodResponseDto.from(f));
  }

  @Post()
  @ApiOperation({
    summary:
      'Guardar una receta: ingredientes del catálogo con sus gramos y cuántas raciones salen.',
  })
  @ApiCreatedResponse({ type: FoodResponseDto })
  @ApiNotFoundResponse({ description: 'BRIO_FOOD_NOT_FOUND.' })
  async create(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: CreateRecipeDto,
  ): Promise<FoodResponseDto> {
    const { food } = await this.createRecipe.execute({
      userId: current.sub,
      name: body.name,
      servings: body.servings,
      ingredients: body.ingredients.map((i) => ({
        foodId: i.foodId,
        grams: i.grams,
      })),
    });
    return FoodResponseDto.from(food);
  }
}
