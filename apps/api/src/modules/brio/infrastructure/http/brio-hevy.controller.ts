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
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import {
  ConnectHevyUseCase,
  DisconnectHevyUseCase,
  GetHevyStatusUseCase,
  SendPlannedRoutineToHevyUseCase,
  SyncHevyUseCase,
  type HevyStatus,
  type HevySyncResult,
  type SentRoutine,
} from '../../application/use-cases/hevy.use-cases';
import { ConnectHevyDto, SendRoutineDto } from './dto/hevy.dto';

// Conexión con Hevy: la clave la pone el usuario y solo sirve para su cuenta.
// Nunca se devuelve ni se escribe en logs.
@ApiTags('brio')
@Auth()
@Controller('brio/hevy')
export class BrioHevyController {
  constructor(
    private readonly status: GetHevyStatusUseCase,
    private readonly connect: ConnectHevyUseCase,
    private readonly sync: SyncHevyUseCase,
    private readonly disconnect: DisconnectHevyUseCase,
    private readonly sendRoutine: SendPlannedRoutineToHevyUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Estado de mi conexión con Hevy.' })
  @ApiOkResponse({ description: 'Conectado o no, y última sincronización.' })
  get(@CurrentUser() current: AccessTokenPayload): Promise<HevyStatus> {
    return this.status.execute(current.sub);
  }

  @Put()
  @ApiOperation({
    summary: 'Conectar Hevy con mi clave de API e importar mis entrenos.',
  })
  @ApiOkResponse({ description: 'Estado tras conectar.' })
  async put(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: ConnectHevyDto,
  ): Promise<{ status: HevyStatus; sync: HevySyncResult | null }> {
    const sync = await this.connect.execute(
      current.sub,
      dto.apiKey,
      dto.importNow ?? true,
    );
    return { status: await this.status.execute(current.sub), sync };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Traer de Hevy lo nuevo, lo cambiado y lo borrado.',
  })
  @ApiOkResponse({ description: 'Resultado de la sincronización.' })
  async postSync(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<{ status: HevyStatus; sync: HevySyncResult }> {
    const sync = await this.sync.execute(current.sub);
    return { status: await this.status.execute(current.sub), sync };
  }

  @Post('routines')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crear en Hevy la rutina de una sesión de fuerza planificada.',
  })
  @ApiOkResponse({ description: 'Rutina creada.' })
  postRoutine(
    @CurrentUser() current: AccessTokenPayload,
    @Body() dto: SendRoutineDto,
  ): Promise<SentRoutine> {
    return this.sendRoutine.execute(current.sub, dto.day);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Desconectar Hevy. Los entrenos ya importados se conservan.',
  })
  @ApiNoContentResponse({ description: 'Desconectado.' })
  async remove(@CurrentUser() current: AccessTokenPayload): Promise<void> {
    await this.disconnect.execute(current.sub);
  }
}
