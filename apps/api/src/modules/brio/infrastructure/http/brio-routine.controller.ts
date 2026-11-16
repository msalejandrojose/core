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
} from '@nestjs/common';
import {
  ApiCreatedResponse,
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
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  ArchiveRoutineUseCase,
  GetRoutineUseCase,
  ListRoutinesUseCase,
  SaveRoutineUseCase,
  SendRoutineToHevyUseCase,
  SyncRoutineWithGarminUseCase,
  type Routine,
  type RoutineGarminSync,
  type RoutineSentToHevy,
} from '../../application/use-cases/routine.use-cases';
import {
  MAX_ROUTINE_EXERCISES,
  type RoutineKind,
} from '../../domain/services/routine';

const KINDS: RoutineKind[] = [
  'STRENGTH',
  'RUN',
  'CYCLE',
  'WALK',
  'HIKE',
  'SWIM',
  'ELLIPTICAL',
  'OTHER_CARDIO',
  'OTHER',
];

export class RoutineExerciseDto {
  @ApiProperty() @IsUUID() exerciseId!: string;
  @ApiProperty({ example: 4 }) @IsInt() sets!: number;
  @ApiProperty({ example: 10 }) @IsInt() reps!: number;
  @ApiPropertyOptional({ example: 60, description: 'Peso previsto (kg).' })
  @IsOptional()
  @IsNumber()
  weightKg?: number | null;
  @ApiPropertyOptional({
    example: 90,
    description: 'Descanso entre series (s).',
  })
  @IsOptional()
  @IsInt()
  restSec?: number | null;
}

export class SaveRoutineDto {
  @ApiProperty({ example: 'Torso A' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @ApiProperty({
    enum: KINDS,
    description: 'STRENGTH = gimnasio; el resto, cardio.',
  })
  @IsIn(KINDS)
  kind!: RoutineKind;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?:
    | string
    | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() plannedDurationMin?:
    | number
    | null;
  @ApiPropertyOptional() @IsOptional() @IsInt() plannedDistanceM?:
    | number
    | null;
  @ApiPropertyOptional({ description: 'Ritmo objetivo (s/km).' })
  @IsOptional()
  @IsInt()
  targetPaceSecPerKm?: number | null;

  @ApiPropertyOptional({ type: [RoutineExerciseDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_ROUTINE_EXERCISES)
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseDto)
  exercises?: RoutineExerciseDto[];
}

// Rutinas guardadas del usuario. Solo ve y toca las suyas.
@ApiTags('brio')
@Auth()
@Controller('brio/routines')
export class BrioRoutineController {
  constructor(
    private readonly listRoutines: ListRoutinesUseCase,
    private readonly getRoutine: GetRoutineUseCase,
    private readonly saveRoutine: SaveRoutineUseCase,
    private readonly archiveRoutine: ArchiveRoutineUseCase,
    private readonly sendToHevy: SendRoutineToHevyUseCase,
    private readonly syncGarmin: SyncRoutineWithGarminUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Mis rutinas, con ejercicios y músculos que trabajan.',
  })
  @ApiOkResponse({ description: 'Rutinas, la última editada primero.' })
  list(@CurrentUser() current: AccessTokenPayload): Promise<Routine[]> {
    return this.listRoutines.execute(current.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Una rutina.' })
  @ApiOkResponse({ description: 'La rutina.' })
  get(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Routine> {
    return this.getRoutine.execute(current.sub, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una rutina.' })
  @ApiCreatedResponse({ description: 'Rutina creada.' })
  create(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: SaveRoutineDto,
  ): Promise<Routine> {
    return this.saveRoutine.execute(current.sub, dto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Sustituir una rutina (nombre, datos y ejercicios).',
  })
  @ApiOkResponse({ description: 'Rutina guardada.' })
  update(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveRoutineDto,
  ): Promise<Routine> {
    return this.saveRoutine.execute(current.sub, dto, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Quitar una rutina (los entrenos hechos con ella se quedan).',
  })
  @ApiNoContentResponse({ description: 'Quitada.' })
  async remove(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.archiveRoutine.execute(current.sub, id);
  }

  @Post(':id/hevy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Crear o actualizar la rutina en mi Hevy.' })
  @ApiOkResponse({
    description: 'Rutina en Hevy y ejercicios que se han quedado fuera.',
  })
  hevy(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutineSentToHevy> {
    return this.sendToHevy.execute(current.sub, id);
  }

  @Post(':id/garmin-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Traer de Garmin el entreno recién hecho y enlazarlo con la rutina.',
  })
  @ApiOkResponse({
    description: 'Resultado de la sincronización y entreno enlazado.',
  })
  garmin(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutineGarminSync> {
    return this.syncGarmin.execute(current.sub, id);
  }
}
