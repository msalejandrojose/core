import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAILER_PORT } from './application/ports/mailer.port';
import { NullMailerAdapter } from './infrastructure/adapters/null.mailer.adapter';
import { ResendMailerAdapter } from './infrastructure/adapters/resend.mailer.adapter';

@Module({
  providers: [
    {
      provide: MAILER_PORT,
      useFactory: (config: ConfigService) => {
        if (config.get<string>('MAIL_API_KEY')) {
          return new ResendMailerAdapter(config);
        }
        // Sin proveedor configurado caemos al adapter nulo para no bloquear el
        // arranque en entornos donde el envío real es opcional (dev, CI).
        new Logger('MailerModule').warn(
          'MAIL_API_KEY no definida — usando NullMailerAdapter (los emails se logean, no se envían).',
        );
        return new NullMailerAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [MAILER_PORT],
})
export class MailerModule {}
