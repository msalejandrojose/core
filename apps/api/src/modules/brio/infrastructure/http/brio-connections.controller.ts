import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  BRIO_CONNECTION_PREFS,
  type ConnectionPrefs,
  type ConnectionPrefsPort,
} from '../../application/ports/connection-prefs.port';

const SHARES = [0, 50, 75, 100];

export class SaveConnectionPrefsDto {
  @ApiPropertyOptional({ description: 'Traer entrenos del reloj.' })
  @IsOptional()
  @IsBoolean()
  importActivities?: boolean;

  @ApiPropertyOptional({ description: 'Traer sueño, pulso y pasos del reloj.' })
  @IsOptional()
  @IsBoolean()
  importHealth?: boolean;

  @ApiPropertyOptional({
    enum: SHARES,
    description:
      'Porcentaje de las kcal de ejercicio que se suman al objetivo del día.',
  })
  @IsOptional()
  @IsIn(SHARES)
  exerciseKcalSharePct?: number;
}

// Preferencias de las conexiones. Es un CRUD de una fila: sin caso de uso.
@ApiTags('brio')
@Auth()
@Controller('brio/connections/prefs')
export class BrioConnectionsController {
  constructor(
    @Inject(BRIO_CONNECTION_PREFS) private readonly prefs: ConnectionPrefsPort,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Mis preferencias de conexiones.' })
  @ApiOkResponse({ description: 'Preferencias vigentes.' })
  get(@CurrentUser() current: AccessTokenPayload): Promise<ConnectionPrefs> {
    return this.prefs.get(current.sub);
  }

  @Put()
  @ApiOperation({ summary: 'Cambiar mis preferencias de conexiones.' })
  @ApiOkResponse({ description: 'Preferencias guardadas.' })
  put(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: SaveConnectionPrefsDto,
  ): Promise<ConnectionPrefs> {
    return this.prefs.save(current.sub, {
      ...(dto.importActivities !== undefined
        ? { importActivities: dto.importActivities }
        : {}),
      ...(dto.importHealth !== undefined
        ? { importHealth: dto.importHealth }
        : {}),
      ...(dto.exerciseKcalSharePct !== undefined
        ? { exerciseKcalSharePct: dto.exerciseKcalSharePct }
        : {}),
    });
  }
}
