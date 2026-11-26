import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import {
  OtaUseCases,
  type UpdateAnswer,
} from '../../application/use-cases/ota.use-cases';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Lo que llama el plugin de actualizaciones en caliente desde la app
 * (`@capgo/capacitor-updater`, `updateUrl`). Público: el plugin no manda
 * sesión; lo que devuelve es un zip cifrado y firmado. El cuerpo se lee a mano
 * porque el plugin manda campos que cambian entre versiones.
 */
@ApiTags('ota')
@Controller('ota')
export class OtaUpdatesController {
  constructor(private readonly ota: OtaUseCases) {}

  @Post('updates')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Comprueba si hay una actualización en caliente para la app (formato del plugin de Capgo).',
  })
  check(@Body() body: Record<string, unknown>): Promise<UpdateAnswer> {
    return this.ota.check({
      appId: str(body?.app_id),
      versionName: str(body?.version_name),
      versionBuild: str(body?.version_build) || null,
      channel: str(body?.defaultChannel) || str(body?.channel) || null,
    });
  }

  @Post('stats')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Estadísticas del plugin (se aceptan y se ignoran).',
  })
  stats(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
