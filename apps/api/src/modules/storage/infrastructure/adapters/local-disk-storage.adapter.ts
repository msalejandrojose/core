import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ObjectStat,
  PutObjectInput,
  SignedUploadUrl,
  StoragePort,
} from '../../application/ports/storage.port';

export interface RawFileTokenPayload {
  key: string;
}

/**
 * Adapter de desarrollo: escribe los binarios en disco bajo `STORAGE_LOCAL_PATH`
 * (`.storage/` por defecto). No soporta subida directa desde el cliente
 * (`getSignedUploadUrl`), ya que no hay nada que lo pueda servir sin pasar
 * por esta API. Las URLs firmadas son tokens JWT de corta duración resueltos
 * por `GET /files/raw?token=...`.
 */
@Injectable()
export class LocalDiskStorageAdapter implements StoragePort {
  private readonly root: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.root = resolve(config.get<string>('STORAGE_LOCAL_PATH') ?? '.storage');
    this.ttlSeconds = Number(
      config.get<string>('STORAGE_RAW_TOKEN_TTL_SECONDS') ?? 300,
    );
  }

  private resolvePath(key: string): string {
    const path = resolve(this.root, key);
    if (!path.startsWith(this.root)) {
      throw new BadRequestException('Clave de fichero inválida.');
    }
    return path;
  }

  async put(input: PutObjectInput): Promise<void> {
    const path = this.resolvePath(input.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, input.body);
  }

  async get(key: string): Promise<Buffer> {
    return readFile(this.resolvePath(key));
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolvePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) !== null;
  }

  async stat(key: string): Promise<ObjectStat | null> {
    try {
      const info = await stat(this.resolvePath(key));
      return { sizeBytes: info.size };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  getSignedUrl(
    key: string,
    expiresInSeconds = this.ttlSeconds,
  ): Promise<string> {
    const token = this.jwt.sign({ key } satisfies RawFileTokenPayload, {
      secret: this.tokenSecret(),
      expiresIn: expiresInSeconds,
    });
    return Promise.resolve(`/files/raw?token=${token}`);
  }

  getSignedUploadUrl(): Promise<SignedUploadUrl> {
    throw new BadRequestException(
      'El driver LOCAL no soporta subida directa; usa POST /files.',
    );
  }

  /** Usado por el controller para resolver el token de `GET /files/raw`. */
  verifyRawToken(token: string): string {
    const payload = this.jwt.verify<RawFileTokenPayload>(token, {
      secret: this.tokenSecret(),
    });
    return payload.key;
  }

  private tokenSecret(): string {
    return (
      this.config.get<string>('STORAGE_RAW_TOKEN_SECRET') ??
      this.config.getOrThrow<string>('JWT_SECRET')
    );
  }
}
