import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER_PORT, type MailerPort } from '../../../mailer/application/ports/mailer.port';
import { ResendMailerAdapter } from '../../../mailer/infrastructure/adapters/resend.mailer.adapter';
import { USER_REPOSITORY, type UserRepositoryPort } from '../ports/user-repository.port';

@Injectable()
export class RequestPasswordResetUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    private readonly config: ConfigService,
  ) {}

  async execute(email: string): Promise<void> {
    // Siempre responder 200 aunque el email no exista (no revelar existencia de cuentas).
    const user = await this.users.findByEmail(email);
    if (!user) return;

    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 h

    await this.users.updateTokens(user.id, {
      passwordResetToken: token,
      passwordResetExpiresAt: expiresAt,
    });

    const baseUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;

    const html = ResendMailerAdapter.renderTemplate('password-reset-email', {
      reset_url: resetUrl,
    });

    await this.mailer.send({
      to: user.email,
      subject: 'Restablece tu contraseña',
      html,
      text: `Restablece tu contraseña en: ${resetUrl}\n\nEste enlace caduca en 1 hora.`,
    });
  }
}
