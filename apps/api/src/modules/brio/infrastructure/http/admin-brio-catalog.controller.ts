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
  Put,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { CatalogAdminUseCases } from '../../application/use-cases/catalog-admin.use-cases';
import {
  AdminActivityTypeDto,
  AdminExerciseDto,
  AdminFoodDto,
  AdminFoodPageDto,
  AdminFoodQueryDto,
  SaveAdminActivityTypeDto,
  SaveAdminExerciseDto,
  SaveAdminFoodDto,
} from './dto/admin-catalog.dto';

// Backoffice de los catálogos globales de Brío. Cada bloque, con su sección.

const food = (dto: SaveAdminFoodDto) => ({
  ...dto,
  brand: dto.brand ?? null,
  barcode: dto.barcode ?? null,
});

@ApiTags('brio-admin')
@Controller('admin/brio/foods')
export class AdminBrioFoodsController {
  constructor(private readonly admin: CatalogAdminUseCases) {}

  @Get()
  @RequiresPermission('brio.foods', 'READ')
  @ApiOperation({
    summary: 'Alimentos del catálogo compartido (buscar, filtrar, paginar)',
  })
  @ApiOkResponse({ type: AdminFoodPageDto })
  async list(@Query() q: AdminFoodQueryDto): Promise<AdminFoodPageDto> {
    const page = await this.admin.listFoods({
      search: q.q?.trim() || null,
      source: q.source ?? null,
      unverified: q.unverified ?? false,
      page: q.page ?? 1,
      pageSize: q.pageSize ?? 25,
    });
    return {
      data: page.data.map((f) => AdminFoodDto.from(f)),
      total: page.total,
    };
  }

  @Post()
  @RequiresPermission('brio.foods', 'WRITE')
  @ApiOperation({ summary: 'Crear un alimento del catálogo' })
  @ApiOkResponse({ type: AdminFoodDto })
  async create(@Body() dto: SaveAdminFoodDto): Promise<AdminFoodDto> {
    return AdminFoodDto.from(await this.admin.saveFood(food(dto)));
  }

  @Put(':id')
  @RequiresPermission('brio.foods', 'WRITE')
  @ApiOperation({ summary: 'Editar un alimento del catálogo (y sus raciones)' })
  @ApiOkResponse({ type: AdminFoodDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAdminFoodDto,
  ): Promise<AdminFoodDto> {
    return AdminFoodDto.from(await this.admin.saveFood(food(dto), id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission('brio.foods', 'WRITE')
  @ApiOperation({
    summary: 'Borrar un alimento (lo ya apuntado conserva su copia)',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.admin.deleteFood(id);
  }
}

@ApiTags('brio-admin')
@Controller('admin/brio/exercises')
export class AdminBrioExercisesController {
  constructor(private readonly admin: CatalogAdminUseCases) {}

  @Get()
  @RequiresPermission('brio.exercises', 'READ')
  @ApiOperation({ summary: 'Ejercicios del catálogo con sus músculos' })
  @ApiOkResponse({ type: [AdminExerciseDto] })
  async list(@Query('q') q?: string): Promise<AdminExerciseDto[]> {
    return (await this.admin.listExercises(q?.trim() || null)).map((e) =>
      AdminExerciseDto.from(e),
    );
  }

  @Post()
  @RequiresPermission('brio.exercises', 'WRITE')
  @ApiOperation({ summary: 'Crear un ejercicio del catálogo' })
  @ApiOkResponse({ type: AdminExerciseDto })
  async create(@Body() dto: SaveAdminExerciseDto): Promise<AdminExerciseDto> {
    return AdminExerciseDto.from(
      await this.admin.saveExercise({ ...dto, code: dto.code ?? null }),
    );
  }

  @Put(':id')
  @RequiresPermission('brio.exercises', 'WRITE')
  @ApiOperation({
    summary: 'Editar un ejercicio (nombre, medida, músculos, archivar)',
  })
  @ApiOkResponse({ type: AdminExerciseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAdminExerciseDto,
  ): Promise<AdminExerciseDto> {
    return AdminExerciseDto.from(
      await this.admin.saveExercise({ ...dto, code: dto.code ?? null }, id),
    );
  }
}

@ApiTags('brio-admin')
@Controller('admin/brio/activity-types')
export class AdminBrioActivityTypesController {
  constructor(private readonly admin: CatalogAdminUseCases) {}

  @Get()
  @RequiresPermission('brio.activity-types', 'READ')
  @ApiOperation({ summary: 'Tipos de actividad globales con su MET' })
  @ApiOkResponse({ type: [AdminActivityTypeDto] })
  async list(): Promise<AdminActivityTypeDto[]> {
    return (await this.admin.listActivityTypes()).map((t) =>
      AdminActivityTypeDto.from(t),
    );
  }

  @Post()
  @RequiresPermission('brio.activity-types', 'WRITE')
  @ApiOperation({ summary: 'Crear un tipo de actividad' })
  @ApiOkResponse({ type: AdminActivityTypeDto })
  async create(
    @Body() dto: SaveAdminActivityTypeDto,
  ): Promise<AdminActivityTypeDto> {
    return AdminActivityTypeDto.from(
      await this.admin.saveActivityType({
        ...dto,
        code: dto.code ?? null,
        icon: dto.icon ?? null,
      }),
    );
  }

  @Put(':id')
  @RequiresPermission('brio.activity-types', 'WRITE')
  @ApiOperation({
    summary: 'Editar un tipo de actividad (MET, disciplina, archivar)',
  })
  @ApiOkResponse({ type: AdminActivityTypeDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveAdminActivityTypeDto,
  ): Promise<AdminActivityTypeDto> {
    return AdminActivityTypeDto.from(
      await this.admin.saveActivityType(
        { ...dto, code: dto.code ?? null, icon: dto.icon ?? null },
        id,
      ),
    );
  }
}
