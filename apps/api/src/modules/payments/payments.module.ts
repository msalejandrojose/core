import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PAYMENT_GATEWAY_PORT } from './application/ports/payment-gateway.port';
import { NullPaymentGatewayAdapter } from './infrastructure/adapters/null-payment-gateway.adapter';
import { StripePaymentGatewayAdapter } from './infrastructure/adapters/stripe-payment-gateway.adapter';

@Module({
  providers: [
    {
      provide: PAYMENT_GATEWAY_PORT,
      useFactory: (config: ConfigService) => {
        const secretKey = config.get<string>('STRIPE_SECRET_KEY');
        if (secretKey) {
          return new StripePaymentGatewayAdapter(
            secretKey,
            config.get<string>('STRIPE_WEBHOOK_SECRET'),
          );
        }
        // Sin proveedor configurado caemos al adapter nulo para no bloquear
        // el arranque en entornos donde el cobro real es opcional (dev, CI).
        new Logger('PaymentsModule').warn(
          'STRIPE_SECRET_KEY no definida — usando NullPaymentGatewayAdapter (checkout simulado, sin cobro real).',
        );
        return new NullPaymentGatewayAdapter();
      },
      inject: [ConfigService],
    },
  ],
  exports: [PAYMENT_GATEWAY_PORT],
})
export class PaymentsModule {}
