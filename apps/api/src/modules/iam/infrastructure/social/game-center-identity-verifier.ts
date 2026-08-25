import { X509Certificate, type KeyObject } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SocialAuthFailedError } from '../../domain/errors/social-auth-failed.error';
import type { SocialProfile } from '../../application/dto/social-profile';
import type { GameCenterIdentityVerifierPort } from '../../application/ports/game-center-identity-verifier.port';
import {
  isAppleGameCenterHost,
  verifyGameCenterSignature,
  type GameCenterVerificationPayload,
} from '../../domain/verify-game-center-signature';

// Game Center nunca da el email del jugador — mismo motivo y misma
// convención de relleno que Play Games (ver `play-games-auth-verifier.ts`).
function placeholderEmail(playerId: string): string {
  return `game-center-${playerId}@accounts.invalid`;
}

// Adaptador de infraestructura: descarga el certificado de Apple y delega la
// verificación criptográfica pura en `verifyGameCenterSignature`. Sin esta
// capa (bundleId + host de Apple + descarga del cert) la función pura por sí
// sola no basta — cualquiera podría mandar su propio certificado autofirmado.
@Injectable()
export class GameCenterIdentityVerifier implements GameCenterIdentityVerifierPort {
  private readonly logger = new Logger(GameCenterIdentityVerifier.name);

  constructor(private readonly config: ConfigService) {}

  async verify(payload: GameCenterVerificationPayload): Promise<SocialProfile> {
    const expectedBundleId = this.config.get<string>('GAME_CENTER_BUNDLE_ID');
    if (!expectedBundleId) {
      this.logger.error(
        'GAME_CENTER_BUNDLE_ID no configurado — no se puede verificar la identidad de Game Center.',
      );
      throw new SocialAuthFailedError('game_center');
    }

    if (payload.bundleId !== expectedBundleId) {
      this.logger.warn(
        `bundleId inesperado en verificación de Game Center: ${payload.bundleId}`,
      );
      throw new SocialAuthFailedError('game_center');
    }

    if (!isAppleGameCenterHost(payload.publicKeyUrl)) {
      this.logger.warn(
        `publicKeyUrl fuera de apple.com: ${payload.publicKeyUrl}`,
      );
      throw new SocialAuthFailedError('game_center');
    }

    const publicKey = await this.fetchApplePublicKey(payload.publicKeyUrl);
    if (!verifyGameCenterSignature(payload, publicKey)) {
      throw new SocialAuthFailedError('game_center');
    }

    return {
      providerId: payload.playerId,
      email: placeholderEmail(payload.playerId),
      firstName: null,
      lastName: null,
      avatarUrl: null,
    };
  }

  private async fetchApplePublicKey(publicKeyUrl: string): Promise<KeyObject> {
    let res: Response;
    try {
      res = await fetch(publicKeyUrl);
    } catch (err) {
      this.logger.error(`No se pudo descargar el certificado de Apple: ${String(err)}`);
      throw new SocialAuthFailedError('game_center');
    }

    if (!res.ok) {
      throw new SocialAuthFailedError('game_center');
    }

    const certDer = Buffer.from(await res.arrayBuffer());
    try {
      return new X509Certificate(certDer).publicKey;
    } catch (err) {
      this.logger.warn(`Certificado de Apple inválido: ${String(err)}`);
      throw new SocialAuthFailedError('game_center');
    }
  }
}
