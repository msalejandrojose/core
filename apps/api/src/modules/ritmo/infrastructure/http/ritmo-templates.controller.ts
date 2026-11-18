import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import type { WorkoutTemplate } from '../../application/ports/workout-template.port';
import {
  DeleteWorkoutTemplateUseCase,
  ListWorkoutTemplatesUseCase,
  SaveWorkoutTemplateUseCase,
} from '../../application/use-cases/workout-templates.use-cases';
import {
  MAX_TEMPLATE_EXERCISES,
  MAX_TEMPLATE_SETS,
} from '../../domain/services/workout-template';

export class TemplateExerciseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  exerciseId!: string;

  @ApiProperty({ example: 3, minimum: 1, maximum: MAX_TEMPLATE_SETS })
  @IsInt()
  @Min(1)
  @Max(MAX_TEMPLATE_SETS)
  sets!: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Repeticiones de referencia.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  reps?: number;

  @ApiPropertyOptional({
    example: 60,
    description: 'Carga de referencia, en kg.',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000)
  weightKg?: number;
}

export class SaveTemplateDto {
  @ApiProperty({ example: 'Pecho + Hombro' })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ type: [TemplateExerciseDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_TEMPLATE_EXERCISES)
  @ValidateNested({ each: true })
  @Type(() => TemplateExerciseDto)
  exercises!: TemplateExerciseDto[];
}

const toData = (dto: SaveTemplateDto) => ({
  name: dto.name,
  exercises: dto.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    sets: e.sets,
    reps: e.reps ?? null,
    weightKg: e.weightKg ?? null,
  })),
});

@ApiTags('ritmo')
@Auth()
@Controller('ritmo/templates')
export class RitmoTemplatesController {
  constructor(
    private readonly listTemplates: ListWorkoutTemplatesUseCase,
    private readonly saveTemplate: SaveWorkoutTemplateUseCase,
    private readonly deleteTemplate: DeleteWorkoutTemplateUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Mis plantillas de entreno de fuerza.' })
  @ApiOkResponse({ description: 'Plantillas con sus ejercicios, por nombre.' })
  list(@CurrentUser() current: AccessTokenPayload): Promise<WorkoutTemplate[]> {
    return this.listTemplates.execute(current.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Crear una plantilla (sustituye la que tenga el mismo nombre).',
  })
  @ApiOkResponse({ description: 'Plantilla guardada.' })
  create(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: SaveTemplateDto,
  ): Promise<WorkoutTemplate> {
    return this.saveTemplate.execute(current.sub, toData(dto));
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cambiar una plantilla.' })
  @ApiOkResponse({ description: 'Plantilla guardada.' })
  update(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveTemplateDto,
  ): Promise<WorkoutTemplate> {
    return this.saveTemplate.execute(current.sub, toData(dto), id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Borrar una plantilla.' })
  @ApiNoContentResponse({ description: 'Borrada.' })
  remove(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.deleteTemplate.execute(current.sub, id);
  }
}
