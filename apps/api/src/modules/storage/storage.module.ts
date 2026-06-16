import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StorageDriver } from './application/config/storage-driver';
import { STORAGE_PORT } from './application/ports/storage.port';
import { STORED_FILE_REPOSITORY } from './application/ports/stored-file-repository.port';
import { UploadFileUseCase } from './application/use-cases/upload-file.use-case';
import { GetFileUseCase } from './application/use-cases/get-file.use-case';
import { ListFilesUseCase } from './application/use-cases/list-files.use-case';
import { DeleteFileUseCase } from './application/use-cases/delete-file.use-case';
import { DownloadFileUseCase } from './application/use-cases/download-file.use-case';
import { GetFileSignedUrlUseCase } from './application/use-cases/get-file-signed-url.use-case';
import { CreateSignedUploadUseCase } from './application/use-cases/create-signed-upload.use-case';
import { ConfirmUploadUseCase } from './application/use-cases/confirm-upload.use-case';
import { LocalDiskStorageAdapter } from './infrastructure/adapters/local-disk-storage.adapter';
import { S3StorageAdapter } from './infrastructure/adapters/s3-storage.adapter';
import { GcsStorageAdapter } from './infrastructure/adapters/gcs-storage.adapter';
import { PrismaStoredFileRepository } from './infrastructure/persistence/prisma-stored-file.repository';
import { FilesController } from './infrastructure/http/files.controller';

@Module({
  imports: [JwtModule.register({})],
  controllers: [FilesController],
  providers: [
    // LocalDiskStorageAdapter y GcsStorageAdapter no validan env en su
    // constructor, así que es seguro instanciarlos siempre. S3StorageAdapter
    // sí lo hace (credenciales, bucket, región): solo se construye si
    // `STORAGE_DRIVER=S3`, para no romper el boot cuando no aplica.
    LocalDiskStorageAdapter,
    GcsStorageAdapter,

    {
      provide: StorageDriver,
      useFactory: (config: ConfigService) =>
        new StorageDriver(
          (config.get<string>('STORAGE_DRIVER') ??
            'LOCAL') as StorageDriver['name'],
        ),
      inject: [ConfigService],
    },
    {
      provide: STORAGE_PORT,
      useFactory: (
        driver: StorageDriver,
        config: ConfigService,
        local: LocalDiskStorageAdapter,
        gcs: GcsStorageAdapter,
      ) => {
        switch (driver.name) {
          case 'S3':
            return new S3StorageAdapter(config);
          case 'GCS':
            return gcs;
          case 'LOCAL':
          default:
            return local;
        }
      },
      inject: [
        StorageDriver,
        ConfigService,
        LocalDiskStorageAdapter,
        GcsStorageAdapter,
      ],
    },
    { provide: STORED_FILE_REPOSITORY, useClass: PrismaStoredFileRepository },

    UploadFileUseCase,
    GetFileUseCase,
    ListFilesUseCase,
    DeleteFileUseCase,
    DownloadFileUseCase,
    GetFileSignedUrlUseCase,
    CreateSignedUploadUseCase,
    ConfirmUploadUseCase,
  ],
  exports: [STORAGE_PORT, STORED_FILE_REPOSITORY],
})
export class StorageModule {}
