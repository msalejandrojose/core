import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { MailDeliveryError } from '../../domain/errors/mail-delivery.error';
import { type MailerPort, type SendMailOptions } from '../../application/ports/mailer.port';

@Injectable()
export class ResendMailerAdapter implements MailerPort {
  private readonly client: Resend;
  private readonly from: string;
  private readonly logger = new Logger(ResendMailerAdapter.name);

  constructor(config: ConfigService) {
    this.client = new Resend(config.getOrThrow<string>('MAIL_API_KEY'));
    this.from = config.getOrThrow<string>('MAIL_FROM');
  }

  async send(options: SendMailOptions): Promise<void> {
    try {
      const { error } = await this.client.emails.send({
        from: this.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      if (error) {
        throw new Error(error.message);
      }
    } catch (err) {
      this.logger.error(`Error enviando email a ${options.to}: ${String(err)}`);
      throw new MailDeliveryError(err);
    }
  }

  /** Carga una plantilla HTML desde disco y reemplaza las variables {{key}}. */
  static renderTemplate(templateName: string, vars: Record<string, string>): string {
    const templatePath = join(__dirname, '..', 'templates', `${templateName}.html`);
    let html = readFileSync(templatePath, 'utf-8');
    for (const [key, value] of Object.entries(vars)) {
      html = html.replaceAll(`{{${key}}}`, value);
    }
    return html;
  }
}
