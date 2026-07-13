import { ApiProperty } from '@nestjs/swagger';
import { type ReservationCheckout } from '../../../application/use-cases/create-reservation-checkout.use-case';

export class CheckoutResponseDto {
  @ApiProperty() paymentId: string;
  @ApiProperty({
    description: 'URL de Stripe Checkout a la que redirigir al huésped.',
  })
  checkoutUrl: string;

  static fromDomain(checkout: ReservationCheckout): CheckoutResponseDto {
    const dto = new CheckoutResponseDto();
    dto.paymentId = checkout.paymentId;
    dto.checkoutUrl = checkout.checkoutUrl;
    return dto;
  }
}
