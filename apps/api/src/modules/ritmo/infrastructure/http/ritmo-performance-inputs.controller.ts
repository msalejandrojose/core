import {
  BadRequestException,
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
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import type {
  Exercise,
  HeartConfig,
  PerformanceMeasurement,
} from '../../domain/entities/performance.entity';
import { AddPerformanceMeasurementUseCase } from '../../application/use-cases/add-performance-measurement.use-case';
import { CreateExerciseUseCase } from '../../application/use-cases/create-exercise.use-case';
import { DeletePerformanceMeasurementUseCase } from '../../application/use-cases/delete-performance-measurement.use-case';
import { GetHeartConfigUseCase } from '../../application/use-cases/get-heart-config.use-case';
import { ListExercisesUseCase } from '../../application/use-cases/list-exercises.use-case';
import { ListPerformanceMeasurementsUseCase } from '../../application/use-cases/list-performance-measurements.use-case';
import { SaveHeartConfigUseCase } from '../../application/use-cases/save-heart-config.use-case';
import {
  AddMeasurementDto,
  CreateExerciseDto,
  SaveHeartConfigDto,
} from './dto/performance-inputs.dto';

// Datos de entrada del motor de rendimiento: catálogo de ejercicios,
// configuración cardíaca y mediciones que el usuario trae de fuera. Todo va
// scopeado a `current.sub`.
@ApiTags('ritmo')
@Auth()
@Controller('ritmo')
export class RitmoPerformanceInputsController {
  constructor(
    private readonly listExercises: ListExercisesUseCase,
    private readonly createExercise: CreateExerciseUseCase,
    private readonly getHeartConfig: GetHeartConfigUseCase,
    private readonly saveHeartConfig: SaveHeartConfigUseCase,
    private readonly listMeasurements: ListPerformanceMeasurementsUseCase,
    private readonly addMeasurement: AddPerformanceMeasurementUseCase,
    private readonly deleteMeasurement: DeletePerformanceMeasurementUseCase,
  ) {}

  @Get('exercises')
  @ApiOperation({
    summary: 'Ejercicios de fuerza (globales + los míos) con sus músculos.',
  })
  @ApiOkResponse({ description: 'Lista de ejercicios con pesos por músculo.' })
  exercises(@CurrentUser() current: AccessTokenPayload): Promise<Exercise[]> {
    return this.listExercises.execute(current.sub);
  }

  @Post('exercises')
  @ApiOperation({ summary: 'Crear un ejercicio propio.' })
  @ApiCreatedResponse({ description: 'Ejercicio creado.' })
  newExercise(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: CreateExerciseDto,
  ): Promise<Exercise> {
    const muscles = new Set(body.muscles.map((m) => m.muscle));
    if (muscles.size !== body.muscles.length) {
      throw new BadRequestException(
        'Cada músculo solo puede aparecer una vez.',
      );
    }
    return this.createExercise.execute({
      userId: current.sub,
      name: body.name.trim(),
      isCompound: body.isCompound ?? false,
      isBodyweight: body.isBodyweight ?? false,
      muscles: body.muscles,
    });
  }

  @Get('heart-config')
  @ApiOperation({ summary: 'Mi FC máxima, en reposo y método de zonas.' })
  @ApiOkResponse({ description: 'Configuración cardíaca (vacía si no hay).' })
  heartConfig(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<HeartConfig> {
    return this.getHeartConfig.execute(current.sub);
  }

  @Put('heart-config')
  @ApiOperation({ summary: 'Guardar mi configuración cardíaca y de zonas.' })
  @ApiOkResponse({ description: 'Configuración guardada.' })
  saveHeart(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: SaveHeartConfigDto,
  ): Promise<HeartConfig> {
    if (body.method === 'HR_RESERVE' && (!body.maxHr || !body.restingHr)) {
      throw new BadRequestException(
        'La reserva cardíaca necesita la FC máxima y la FC en reposo.',
      );
    }
    if (body.method === 'CUSTOM') {
      const z = body.customZones;
      if (!z || z.some((v, i) => i > 0 && v <= z[i - 1])) {
        throw new BadRequestException(
          'Las zonas personalizadas son cuatro límites en ppm, de menor a mayor.',
        );
      }
    }
    return this.saveHeartConfig.execute(current.sub, {
      maxHr: body.maxHr ?? null,
      restingHr: body.restingHr ?? null,
      method: body.method,
      customZones: body.customZones ?? null,
    });
  }

  @Get('performance/measurements')
  @ApiOperation({
    summary: 'Mis mediciones de VO2max y umbral (de test o dispositivo).',
  })
  @ApiOkResponse({
    description: 'Mediciones, de la más reciente a la más antigua.',
  })
  measurements(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<PerformanceMeasurement[]> {
    return this.listMeasurements.execute(current.sub);
  }

  @Post('performance/measurements')
  @ApiOperation({ summary: 'Registrar una medición de VO2max o de umbral.' })
  @ApiCreatedResponse({ description: 'Medición guardada.' })
  newMeasurement(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: AddMeasurementDto,
  ): Promise<PerformanceMeasurement> {
    return this.addMeasurement.execute({
      userId: current.sub,
      metric: body.metric,
      value: body.value,
      heartRate: body.heartRate ?? null,
      origin: body.origin,
      sourceLabel: body.sourceLabel?.trim() || null,
      measuredOn: body.measuredOn.slice(0, 10),
    });
  }

  @Delete('performance/measurements/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar una medición mía.' })
  @ApiNoContentResponse()
  async removeMeasurement(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteMeasurement.execute(id, current.sub);
  }
}
