import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { MobileBuildsUseCases } from '../../application/use-cases/mobile-builds.use-cases';
import {
  LaunchMobileBuildDto,
  MobileBuildArtifactUrlDto,
  MobileBuildDetailDto,
  MobileBuildDto,
  MobileBuildListDto,
} from './dto/mobile-builds.dto';

// Backoffice de los builds nativos: lanzar uno en el Mac (GitHub Actions con el
// runner self-hosted), ver cómo van, cancelarlos y bajar el resultado.
@ApiTags('mobile-builds-admin')
@Controller('admin/mobile-builds')
export class AdminMobileBuildsController {
  constructor(private readonly builds: MobileBuildsUseCases) {}

  @Get()
  @RequiresPermission('ota.builds', 'READ')
  @ApiOperation({ summary: 'Últimos builds y estado del Mac' })
  @ApiOkResponse({ type: MobileBuildListDto })
  async list(): Promise<MobileBuildListDto> {
    return MobileBuildListDto.from(await this.builds.list());
  }

  @Post()
  @RequiresPermission('ota.builds', 'WRITE')
  @ApiOperation({
    summary: 'Lanza un build en el Mac con un perfil de native.config.yml',
  })
  @ApiOkResponse({ type: MobileBuildDetailDto })
  async launch(
    @Body() dto: LaunchMobileBuildDto,
  ): Promise<MobileBuildDetailDto> {
    return MobileBuildDetailDto.fromDetail(await this.builds.launch(dto));
  }

  @Get(':id')
  @RequiresPermission('ota.builds', 'READ')
  @ApiOperation({ summary: 'Un build con sus artefactos' })
  @ApiOkResponse({ type: MobileBuildDetailDto })
  async get(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MobileBuildDetailDto> {
    return MobileBuildDetailDto.fromDetail(await this.builds.get(id));
  }

  @Post(':id/cancel')
  @RequiresPermission('ota.builds', 'WRITE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancela un build que aún no ha terminado' })
  @ApiOkResponse({ type: MobileBuildDto })
  async cancel(@Param('id', ParseIntPipe) id: number): Promise<MobileBuildDto> {
    return MobileBuildDto.from(await this.builds.cancel(id));
  }

  @Get(':id/artifacts/:artifactId/url')
  @RequiresPermission('ota.builds', 'READ')
  @ApiOperation({
    summary: 'URL de descarga (un minuto) del zip de un artefacto',
  })
  @ApiOkResponse({ type: MobileBuildArtifactUrlDto })
  async artifactUrl(
    @Param('id', ParseIntPipe) id: number,
    @Param('artifactId', ParseIntPipe) artifactId: number,
  ): Promise<MobileBuildArtifactUrlDto> {
    return { url: await this.builds.artifactUrl(id, artifactId) };
  }
}
