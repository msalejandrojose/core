import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';
import {
  ObjectStat,
  PutObjectInput,
  SignedUploadUrl,
  StoragePort,
} from '../../application/ports/storage.port';

/**
 * Adapter de producción. Habla S3 vía `@aws-sdk/client-s3`; `STORAGE_S3_ENDPOINT`
 * + `STORAGE_S3_FORCE_PATH_STYLE` permiten apuntarlo a MinIO/R2 en vez del S3 real.
 */
@Injectable()
export class S3StorageAdapter implements StoragePort {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: ConfigService) {
    this.bucket = config.getOrThrow<string>('STORAGE_S3_BUCKET');
    const endpoint = config.get<string>('STORAGE_S3_ENDPOINT');

    this.client = new S3Client({
      region: config.getOrThrow<string>('STORAGE_S3_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('STORAGE_S3_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>(
          'STORAGE_S3_SECRET_ACCESS_KEY',
        ),
      },
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle:
        config.get<string>('STORAGE_S3_FORCE_PATH_STYLE') === 'true',
    });
  }

  async put(input: PutObjectInput): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const bytes = await result.Body?.transformToByteArray();
    return Buffer.from(bytes ?? []);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) !== null;
  }

  async stat(key: string): Promise<ObjectStat | null> {
    try {
      const head = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        sizeBytes: head.ContentLength ?? 0,
        contentType: head.ContentType,
      };
    } catch (err) {
      if (err instanceof NotFound) return null;
      throw err;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds = 300): Promise<string> {
    return presign(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      {
        expiresIn: expiresInSeconds,
      },
    );
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
  ): Promise<SignedUploadUrl> {
    const url = await presign(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
      }),
      { expiresIn: 300 },
    );
    return { url, headers: { 'Content-Type': contentType } };
  }
}
