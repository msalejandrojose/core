import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  ConnectGarminUseCase,
  DisconnectGarminUseCase,
  GetGarminStatusUseCase,
  GetRecentHealthUseCase,
  SyncGarminUseCase,
  type GarminStatus,
  type GarminSyncResult,
  type RecentHealth,
} from '../../application/use-cases/garmin.use-cases';

export class ConnectGarminDto {
  @ApiProperty({
    description:
      'Clave personal de Garmin Connect (Ajustes → clave de API personal). Se guarda cifrada y no se devuelve.',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(500)
  apiKey!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Importar entrenos y salud nada más conectar.',
  })
  @IsOptional()
  @IsBoolean()
  importNow?: boolean;
}

// Conexión con Garmin por clave personal: solo los datos del propio usuario.
// La clave nunca se devuelve ni se escribe en logs.
@ApiTags('ritmo')
@Auth()
@Controller('ritmo')
export class RitmoGarminController {
  constructor(
    private readonly status: GetGarminStatusUseCase,
    private readonly connect: ConnectGarminUseCase,
    private readonly sync: SyncGarminUseCase,
    private readonly disconnect: DisconnectGarminUseCase,
    private readonly recentHealth: GetRecentHealthUseCase,
  ) {}

  @Get('garmin')
  @ApiOperation({ summary: 'Estado de mi conexión con Garmin.' })
  @ApiOkResponse({ description: 'Conectado o no, y última sincronización.' })
  get(@CurrentUser() current: AccessTokenPayload): Promise<GarminStatus> {
    return this.status.execute(current.sub);
  }

  @Put('garmin')
  @ApiOperation({
    summary: 'Conectar Garmin con mi clave personal e importar mis datos.',
  })
  @ApiOkResponse({ description: 'Estado tras conectar.' })
  async put(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: ConnectGarminDto,
  ): Promise<{ status: GarminStatus; sync: GarminSyncResult | null }> {
    const sync = await this.connect.execute(
      current.sub,
      dto.apiKey,
      dto.importNow ?? true,
    );
    return { status: await this.status.execute(current.sub), sync };
  }

  @Post('garmin/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Traer de Garmin los entrenos y la salud recientes.',
  })
  @ApiOkResponse({ description: 'Resultado de la sincronización.' })
  async postSync(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<{ status: GarminStatus; sync: GarminSyncResult }> {
    const sync = await this.sync.execute(current.sub);
    return { status: await this.status.execute(current.sub), sync };
  }

  @Delete('garmin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desconectar Garmin. Lo ya importado se conserva.',
  })
  @ApiNoContentResponse({ description: 'Desconectado.' })
  async remove(@CurrentUser() current: AccessTokenPayload): Promise<void> {
    await this.disconnect.execute(current.sub);
  }

  @Get('health/recent')
  @ApiOperation({
    summary:
      'Sueño, variabilidad cardíaca y pulso en reposo recientes, frente a mi media.',
  })
  @ApiOkResponse({ description: 'Últimos días y comparación con la media.' })
  health(@CurrentUser() current: AccessTokenPayload): Promise<RecentHealth> {
    return this.recentHealth.execute(current.sub);
  }
}
