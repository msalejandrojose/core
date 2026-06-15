import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER_PORT } from './application/ports/mailer.port';
import { ResendMailerAdapter } from './infrastructure/adapters/resend.mailer.adapter';

@Module({
  providers: [
    {
      provide: MAILER_PORT,
      useFactory: (config: ConfigService) => new ResendMailerAdapter(config),
      inject: [ConfigService],
    },
  ],
  exports: [MAILER_PORT],
})
export class MailerModule {}
