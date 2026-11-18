import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ImportHevyCsvUseCase,
  type HevyCsvImportResult,
} from '../../application/use-cases/import-hevy-csv.use-case';
import { MAX_CSV_BYTES } from '../../domain/services/hevy-csv';
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
@ApiTags('ritmo')
@Auth()
@Controller('ritmo/hevy')
export class RitmoHevyController {
  constructor(
    private readonly status: GetHevyStatusUseCase,
    private readonly connect: ConnectHevyUseCase,
    private readonly sync: SyncHevyUseCase,
    private readonly disconnect: DisconnectHevyUseCase,
    private readonly sendRoutine: SendPlannedRoutineToHevyUseCase,
    private readonly importCsv: ImportHevyCsvUseCase,
  ) {}

  @Post('import-csv')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Importar el CSV de entrenos que exporta Hevy (no hace falta conectar la cuenta).',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOkResponse({
    description:
      'Entrenos importados, ejercicios creados y plantillas nuevas. Volver a subir el mismo archivo no duplica nada.',
  })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_CSV_BYTES, files: 1 } }),
  )
  importFromCsv(
    @CurrentUser() current: AccessTokenPayload,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<HevyCsvImportResult> {
    if (!file) throw new BadRequestException('RITMO_HEVY_CSV_INVALID');
    return this.importCsv.execute(current.sub, file.buffer);
  }

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
