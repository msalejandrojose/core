import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER_PORT, type MailerPort } from '../../../mailer/application/ports/mailer.port';
import { ResendMailerAdapter } from '../../../mailer/infrastructure/adapters/resend.mailer.adapter';
import { UserNotFoundError } from '../../domain/errors/user-not-found.error';
import { USER_REPOSITORY, type UserRepositoryPort } from '../ports/user-repository.port';

@Injectable()
export class SendVerificationEmailUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
    private readonly config: ConfigService,
  ) {}

  async execute(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError(userId);

    const token = randomBytes(48).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h

    await this.users.updateTokens(userId, {
      emailVerificationToken: token,
      emailVerificationExpiresAt: expiresAt,
    });

    const baseUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${token}`;

    const html = ResendMailerAdapter.renderTemplate('verification-email', {
      verification_url: verificationUrl,
    });

    await this.mailer.send({
      to: user.email,
      subject: 'Verifica tu dirección de email',
      html,
      text: `Verifica tu email en: ${verificationUrl}\n\nEste enlace caduca en 24 horas.`,
    });
  }
}
