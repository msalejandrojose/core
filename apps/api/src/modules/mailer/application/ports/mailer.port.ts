export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailerPort {
  send(options: SendMailOptions): Promise<void>;
}

export const MAILER_PORT = 'MAILER_PORT';
