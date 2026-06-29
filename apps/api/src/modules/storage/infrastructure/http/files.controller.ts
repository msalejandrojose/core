import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Res,
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
import type { Response } from 'express';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.use-case';
import { GetFileUseCase } from '../../application/use-cases/get-file.use-case';
import { ListFilesUseCase } from '../../application/use-cases/list-files.use-case';
import { DeleteFileUseCase } from '../../application/use-cases/delete-file.use-case';
import { DownloadFileUseCase } from '../../application/use-cases/download-file.use-case';
import { GetFileSignedUrlUseCase } from '../../application/use-cases/get-file-signed-url.use-case';
import { CreateSignedUploadUseCase } from '../../application/use-cases/create-signed-upload.use-case';
import { ConfirmUploadUseCase } from '../../application/use-cases/confirm-upload.use-case';
import { LocalDiskStorageAdapter } from '../adapters/local-disk-storage.adapter';
import { Public } from '../../../iam/infrastructure/http/decorators/public.decorator';
import { StoredFileResponseDto } from './dto/stored-file-response.dto';
import { ListFilesQueryDto } from './dto/list-files-query.dto';
import { CreateSignedUploadDto } from './dto/create-signed-upload.dto';

@ApiTags('files')
@Controller('files')
export class FilesController {
  constructor(
    private readonly uploadFile: UploadFileUseCase,
    private readonly getFile: GetFileUseCase,
    private readonly listFiles: ListFilesUseCase,
    private readonly deleteFile: DeleteFileUseCase,
    private readonly downloadFile: DownloadFileUseCase,
    private readonly getFileSignedUrl: GetFileSignedUrlUseCase,
    private readonly createSignedUpload: CreateSignedUploadUseCase,
    private readonly confirmUpload: ConfirmUploadUseCase,
    private readonly localDiskAdapter: LocalDiskStorageAdapter,
  ) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Sube un fichero directamente a través de la API.' })
  @ApiOkResponse({ type: StoredFileResponseDto })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<StoredFileResponseDto> {
    if (!file) {
      throw new BadRequestException('Falta el fichero en el campo "file".');
    }
    const stored = await this.uploadFile.execute({
      originalName: file.originalname,
      mimeType: file.mimetype,
      buffer: file.buffer,
    });
    return StoredFileResponseDto.fromDomain(stored);
  }

  @Post('signed-upload-url')
  @ApiOperation({
    summary:
      'Crea una URL firmada para subir el binario directamente al storage.',
  })
  async createUploadUrl(@Body() dto: CreateSignedUploadDto) {
    return this.createSignedUpload.execute(dto);
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary:
      'Confirma que un fichero subido vía signed upload URL llegó al storage.',
  })
  @ApiOkResponse({ type: StoredFileResponseDto })
  async confirm(@Param('id') id: string): Promise<StoredFileResponseDto> {
    const file = await this.confirmUpload.execute(id);
    return StoredFileResponseDto.fromDomain(file);
  }

  @Get()
  @ApiOperation({ summary: 'Lista ficheros (paginado).' })
  async list(@Query() query: ListFilesQueryDto) {
    const result = await this.listFiles.execute(query);
    return {
      items: result.items.map((file) => StoredFileResponseDto.fromDomain(file)),
      total: result.total,
    };
  }

  @Get('raw')
  @Public()
  @ApiOperation({
    summary:
      'Sirve el binario de un fichero LOCAL a partir de un token firmado de corta duración.',
  })
  async raw(
    @Query('token') token: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!token) {
      throw new BadRequestException('Falta el query param "token".');
    }
    const key = this.localDiskAdapter.verifyRawToken(token);
    const buffer = await this.localDiskAdapter.get(key);
    res.send(buffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Devuelve la metadata de un fichero.' })
  @ApiOkResponse({ type: StoredFileResponseDto })
  async get(@Param('id') id: string): Promise<StoredFileResponseDto> {
    const file = await this.getFile.execute(id);
    return StoredFileResponseDto.fromDomain(file);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Descarga el binario de un fichero a través de la API.',
  })
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const { file, buffer } = await this.downloadFile.execute(id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
    });
    res.send(buffer);
  }

  @Get(':id/signed-url')
  @ApiOperation({
    summary:
      'Devuelve una URL firmada de corta duración para acceder al fichero.',
  })
  async signedUrl(@Param('id') id: string): Promise<{ url: string }> {
    const url = await this.getFileSignedUrl.execute(id);
    return { url };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borra (lógicamente) un fichero.' })
  async remove(@Param('id') id: string): Promise<void> {
    await this.deleteFile.execute(id);
  }
}
