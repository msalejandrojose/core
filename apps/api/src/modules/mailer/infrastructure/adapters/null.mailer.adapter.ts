import { Injectable, Logger } from '@nestjs/common';
import { type MailerPort, type SendMailOptions } from '../../application/ports/mailer.port';

/**
 * Adapter nulo para tests / CI. Registra el intento pero no hace ninguna
 * llamada de red. Se puede sustituir vía DI sin cambiar el código del dominio.
 */
@Injectable()
export class NullMailerAdapter implements MailerPort {
  private readonly logger = new Logger(NullMailerAdapter.name);

  async send(options: SendMailOptions): Promise<void> {
    this.logger.log(`[NullMailer] Email a ${options.to}: ${options.subject}`);
  }
}
