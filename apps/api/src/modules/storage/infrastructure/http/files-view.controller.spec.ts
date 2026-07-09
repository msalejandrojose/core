import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { FilesController } from './files.controller';
import { FileViewTokenService } from './file-view-token.service';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.use-case';
import { GetFileUseCase } from '../../application/use-cases/get-file.use-case';
import { ListFilesUseCase } from '../../application/use-cases/list-files.use-case';
import { DeleteFileUseCase } from '../../application/use-cases/delete-file.use-case';
import { DownloadFileUseCase } from '../../application/use-cases/download-file.use-case';
import { GetFileSignedUrlUseCase } from '../../application/use-cases/get-file-signed-url.use-case';
import { CreateSignedUploadUseCase } from '../../application/use-cases/create-signed-upload.use-case';
import { ConfirmUploadUseCase } from '../../application/use-cases/confirm-upload.use-case';
import { LocalDiskStorageAdapter } from '../adapters/local-disk-storage.adapter';
import type { StoredFile } from '../../domain/entities/stored-file.entity';

// Verifica la ruta de visualización inline con soporte de Range end-to-end:
// se monta solo el FilesController con los use cases mockeados (sin DB ni
// storage real), y se ejercita el streaming real (headers, 200/206/416).
describe('FilesController — inline view (Range)', () => {
  let app: INestApplication;
  const body = Buffer.from('0123456789'); // 10 bytes

  const file: StoredFile = {
    id: 'file-1',
    ownerUserId: null,
    originalName: 'clip.mp4',
    mimeType: 'video/mp4',
    sizeBytes: body.length,
    driver: 'LOCAL',
    status: 'READY',
    storageKey: 'k/clip.mp4',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const downloadFile = { execute: jest.fn().mockResolvedValue({ file, buffer: body }) };
  const viewTokens = {
    issue: jest.fn().mockReturnValue('signed-token'),
    verify: jest.fn().mockReturnValue('file-1'),
  };
  const noop = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: UploadFileUseCase, useValue: noop },
        { provide: GetFileUseCase, useValue: noop },
        { provide: ListFilesUseCase, useValue: noop },
        { provide: DeleteFileUseCase, useValue: noop },
        { provide: DownloadFileUseCase, useValue: downloadFile },
        { provide: GetFileSignedUrlUseCase, useValue: noop },
        { provide: CreateSignedUploadUseCase, useValue: noop },
        { provide: ConfirmUploadUseCase, useValue: noop },
        { provide: LocalDiskStorageAdapter, useValue: {} },
        { provide: FileViewTokenService, useValue: viewTokens },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the full file inline with Accept-Ranges', async () => {
    const res = await request(app.getHttpServer()).get('/files/file-1/view');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('video/mp4');
    expect(res.headers['content-disposition']).toBe('inline; filename="clip.mp4"');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.headers['content-length']).toBe('10');
  });

  it('serves a partial range with 206 and Content-Range', async () => {
    const res = await request(app.getHttpServer())
      .get('/files/file-1/view')
      .set('Range', 'bytes=2-5');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 2-5/10');
    expect(res.headers['content-length']).toBe('4');
    expect(res.body.toString()).toBe('2345');
  });

  it('answers 416 for an unsatisfiable range', async () => {
    const res = await request(app.getHttpServer())
      .get('/files/file-1/view')
      .set('Range', 'bytes=100-200');
    expect(res.status).toBe(416);
    expect(res.headers['content-range']).toBe('bytes */10');
  });

  it('resolves the public token route via the view token service', async () => {
    const res = await request(app.getHttpServer()).get('/files/view?token=signed-token');
    expect(res.status).toBe(200);
    expect(viewTokens.verify).toHaveBeenCalledWith('signed-token');
    expect(res.body.toString()).toBe('0123456789');
  });

  it('rejects the public route without a token', async () => {
    const res = await request(app.getHttpServer()).get('/files/view');
    expect(res.status).toBe(400);
  });

  it('issues an opaque view URL', async () => {
    const res = await request(app.getHttpServer()).get('/files/file-1/view-url');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: '/files/view?token=signed-token' });
  });
});
