import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
  IsArray,
  IsIn,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  DisconnectHealthDeviceUseCase,
  GetHealthDeviceStatusUseCase,
  ImportDeviceHealthUseCase,
  type DeviceHealthResult,
  type HealthDeviceStatus,
} from '../../application/use-cases/device-health.use-cases';

export class DeviceDayDto {
  @ApiProperty({
    example: '2026-11-15',
    description: 'Día local (YYYY-MM-DD).',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  day!: string;

  @ApiPropertyOptional() @IsOptional() @IsNumber() steps?: number | null;
  @ApiPropertyOptional({ description: 'Pulso en reposo (lpm).' })
  @IsOptional()
  @IsNumber()
  restingHr?: number | null;
  @ApiPropertyOptional({ description: 'Variabilidad cardíaca media (ms).' })
  @IsOptional()
  @IsNumber()
  hrvMs?: number | null;
  @ApiPropertyOptional({
    description: 'Sueño de la noche que acaba ese día (s).',
  })
  @IsOptional()
  @IsNumber()
  sleepSec?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() deepSleepSec?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() remSleepSec?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() awakeSec?: number | null;
  @ApiPropertyOptional({ description: 'Último peso del día (kg).' })
  @IsOptional()
  @IsNumber()
  weightKg?: number | null;
}

export class DeviceWorkoutDto {
  @ApiProperty({ description: 'UUID de HealthKit o id de Health Connect.' })
  @IsString()
  @MaxLength(191)
  id!: string;

  @ApiProperty({ example: 'running' })
  @IsString()
  @MaxLength(60)
  workoutType!: string;

  @ApiProperty() @IsISO8601() startDate!: string;
  @ApiProperty() @IsISO8601() endDate!: string;
  @ApiProperty() @IsNumber() durationSec!: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() kcal?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() distanceM?: number | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceName?: string | null;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(191)
  sourceId?: string | null;
}

export class DeviceHealthImportDto {
  @ApiProperty({ enum: ['ios', 'android'] })
  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';

  @ApiProperty({ type: [DeviceDayDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => DeviceDayDto)
  days!: DeviceDayDto[];

  @ApiProperty({ type: [DeviceWorkoutDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => DeviceWorkoutDto)
  workouts!: DeviceWorkoutDto[];
}

// Apple Salud / Health Connect: el móvil lee los datos (los permisos son del
// teléfono) y los manda aquí. Solo afecta al propio usuario.
@ApiTags('brio')
@Auth()
@Controller('brio/health/device')
export class BrioHealthDeviceController {
  constructor(
    private readonly status: GetHealthDeviceStatusUseCase,
    private readonly importHealth: ImportDeviceHealthUseCase,
    private readonly disconnect: DisconnectHealthDeviceUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Estado de mi conexión con Apple Salud / Health Connect.',
  })
  @ApiOkResponse({ description: 'Conectado o no, y última sincronización.' })
  get(@CurrentUser() current: AccessTokenPayload): Promise<HealthDeviceStatus> {
    return this.status.execute(current.sub);
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Guardar la salud y los entrenos leídos en el móvil de Apple Salud o Health Connect.',
  })
  @ApiOkResponse({ description: 'Estado y resultado de la importación.' })
  async sync(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: DeviceHealthImportDto,
  ): Promise<{ status: HealthDeviceStatus; sync: DeviceHealthResult }> {
    const sync = await this.importHealth.execute(current.sub, dto);
    return { status: await this.status.execute(current.sub), sync };
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desconectar Apple Salud / Health Connect. Lo ya traído se queda.',
  })
  @ApiNoContentResponse({ description: 'Desconectado.' })
  async remove(@CurrentUser() current: AccessTokenPayload): Promise<void> {
    await this.disconnect.execute(current.sub);
  }
}
