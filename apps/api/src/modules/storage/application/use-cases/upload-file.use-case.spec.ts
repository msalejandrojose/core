/* eslint-disable @typescript-eslint/unbound-method -- jest.Mocked methods reported as unbound false positive */
import { UploadFileUseCase } from './upload-file.use-case';
import { StoragePort } from '../ports/storage.port';
import { StoredFileRepositoryPort } from '../ports/stored-file-repository.port';
import { StorageDriver } from '../config/storage-driver';
import { StoredFile } from '../../domain/entities/stored-file.entity';

describe('UploadFileUseCase', () => {
  function makeFile(overrides: Partial<StoredFile> = {}): StoredFile {
    return {
      id: 'file-1',
      ownerUserId: null,
      originalName: 'photo.png',
      mimeType: 'image/png',
      sizeBytes: 3,
      driver: 'LOCAL',
      status: 'READY',
      storageKey: 'key-1',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
  }

  it('writes the binary to storage and persists the metadata', async () => {
    const createdFile = makeFile();
    const storage: jest.Mocked<StoragePort> = {
      put: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      stat: jest.fn(),
      getSignedUrl: jest.fn(),
      getSignedUploadUrl: jest.fn(),
    };
    const repository: jest.Mocked<StoredFileRepositoryPort> = {
      create: jest.fn().mockResolvedValue(createdFile),
      findById: jest.fn(),
      list: jest.fn(),
      markReady: jest.fn(),
      softDelete: jest.fn(),
    };
    const useCase = new UploadFileUseCase(
      storage,
      repository,
      new StorageDriver('LOCAL'),
    );

    const result = await useCase.execute({
      originalName: 'photo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('abc'),
    });

    expect(storage.put).toHaveBeenCalledWith(
      expect.objectContaining({
        body: Buffer.from('abc'),
        contentType: 'image/png',
      }),
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        originalName: 'photo.png',
        mimeType: 'image/png',
        sizeBytes: 3,
        driver: 'LOCAL',
        status: 'READY',
      }),
    );
    expect(result).toBe(createdFile);
  });
});
