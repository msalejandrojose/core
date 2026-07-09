import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface FileViewTokenPayload {
  /** id del StoredFile que se autoriza a visualizar. */
  fid: string;
  /** Discrimina estos tokens de otros firmados con el mismo secreto. */
  scope: 'file-view';
}

/**
 * Emite y verifica tokens opacos de corta duración para visualizar un fichero
 * a través de la API (`GET /files/view?token=...`) sin necesidad de cabeceras
 * de autenticación. El token codifica únicamente el id opaco del StoredFile,
 * nunca la clave real en el bucket, así que el binario siempre se sirve
 * proxeado por la API y la ruta física del storage jamás se expone.
 *
 * Reutiliza la convención de secreto del adapter local
 * (`STORAGE_RAW_TOKEN_SECRET` → `JWT_SECRET`) para no introducir un secreto
 * nuevo. El TTL es más largo que el de `raw` porque una URL de visualización
 * suele embeberse en una página que el usuario mantiene abierta un rato.
 */
@Injectable()
export class FileViewTokenService {
  private readonly ttlSeconds: number;

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.ttlSeconds = Number(
      config.get<string>('STORAGE_VIEW_TOKEN_TTL_SECONDS') ?? 3600,
    );
  }

  issue(fileId: string, expiresInSeconds = this.ttlSeconds): string {
    return this.jwt.sign(
      { fid: fileId, scope: 'file-view' } satisfies FileViewTokenPayload,
      { secret: this.secret(), expiresIn: expiresInSeconds },
    );
  }

  verify(token: string): string {
    let payload: FileViewTokenPayload;
    try {
      payload = this.jwt.verify<FileViewTokenPayload>(token, {
        secret: this.secret(),
      });
    } catch {
      throw new BadRequestException('Token de visualización inválido o caducado.');
    }
    if (payload.scope !== 'file-view' || !payload.fid) {
      throw new BadRequestException('Token de visualización inválido.');
    }
    return payload.fid;
  }

  private secret(): string {
    return (
      this.config.get<string>('STORAGE_RAW_TOKEN_SECRET') ??
      this.config.getOrThrow<string>('JWT_SECRET')
    );
  }
}
