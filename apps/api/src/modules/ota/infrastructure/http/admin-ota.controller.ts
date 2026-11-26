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
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { OtaUseCases } from '../../application/use-cases/ota.use-cases';
import { MAX_BUNDLE_BYTES } from '../../domain/services/ota';
import {
  ListOtaBundlesQueryDto,
  OtaBundleDto,
  OtaBundleListDto,
  OtaPurgeQueryDto,
  OtaPurgeResultDto,
  PublishOtaBundleDto,
  SetOtaBundleEnabledDto,
} from './dto/ota.dto';

// Backoffice de las actualizaciones en caliente: lo que se ha subido por app,
// activar/desactivar (vuelta atrás) y borrar zips del storage.
@ApiTags('ota-admin')
@Controller('admin/ota/bundles')
export class AdminOtaController {
  constructor(private readonly ota: OtaUseCases) {}

  @Get()
  @RequiresPermission('ota.bundles', 'READ')
  @ApiOperation({ summary: 'Subidas de una app y canal, la más nueva primero' })
  @ApiOkResponse({ type: OtaBundleListDto })
  async list(@Query() q: ListOtaBundlesQueryDto): Promise<OtaBundleListDto> {
    const r = await this.ota.list(q.appId?.trim() || null, q.channel ?? null);
    return { ...r, bundles: r.bundles.map((b) => OtaBundleDto.from(b)) };
  }

  @Post()
  @RequiresPermission('ota.bundles', 'WRITE')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Sube una actualización (zip ya cifrado por `pnpm --filter @core/mobile ota:publish`) y la deja activa',
  })
  @ApiOkResponse({ type: OtaBundleDto })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_BUNDLE_BYTES } }),
  )
  async publish(
    @Body() dto: PublishOtaBundleDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<OtaBundleDto> {
    if (!file)
      throw new BadRequestException('Falta el zip en el campo "file".');
    const b = await this.ota.publish(dto, file.buffer, user?.sub ?? null);
    return OtaBundleDto.from(b);
  }

  @Patch(':id')
  @RequiresPermission('ota.bundles', 'WRITE')
  @ApiOperation({
    summary:
      'Activar o desactivar una subida (desactivar la última = volver a la anterior)',
  })
  @ApiOkResponse({ type: OtaBundleDto })
  async setEnabled(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetOtaBundleEnabledDto,
  ): Promise<OtaBundleDto> {
    return OtaBundleDto.from(await this.ota.setEnabled(id, dto.isEnabled));
  }

  @Delete(':id')
  @RequiresPermission('ota.bundles', 'WRITE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borra el zip del storage (queda en el historial)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.ota.remove(id);
  }

  @Post('purge')
  @RequiresPermission('ota.bundles', 'WRITE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Borra ya los zips que sobran (de una app o de todas con all=true)',
  })
  @ApiOkResponse({ type: OtaPurgeResultDto })
  async purge(@Query() q: OtaPurgeQueryDto): Promise<OtaPurgeResultDto> {
    const removed = q.all
      ? await this.ota.purge()
      : await this.ota.purge(q.appId?.trim() || undefined, q.channel);
    return { removed };
  }
}
