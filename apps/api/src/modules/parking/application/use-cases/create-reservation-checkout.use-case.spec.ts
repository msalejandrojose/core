import { CreateReservationCheckoutUseCase } from './create-reservation-checkout.use-case';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import { ReservationNotPayableError } from '../../domain/errors/reservation-not-payable.error';

describe('CreateReservationCheckoutUseCase', () => {
  let reservations: { findByIdForParticipant: jest.Mock };
  let payments: { findByReservationId: jest.Mock; create: jest.Mock };
  let gateway: { createCheckoutSession: jest.Mock };
  let config: { get: jest.Mock };
  let useCase: CreateReservationCheckoutUseCase;

  const reservation = {
    id: 'res-1',
    guestUserId: 'guest-1',
    totalAmount: 100,
    status: 'PENDING',
  };

  beforeEach(() => {
    reservations = {
      findByIdForParticipant: jest.fn().mockResolvedValue(reservation),
    };
    payments = {
      findByReservationId: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
    };
    gateway = {
      createCheckoutSession: jest
        .fn()
        .mockResolvedValue({ sessionId: 'cs_1', url: 'https://stripe/cs_1' }),
    };
    config = { get: jest.fn().mockReturnValue(undefined) };
    useCase = new CreateReservationCheckoutUseCase(
      reservations as never,
      payments as never,
      gateway as never,
      config as never,
    );
  });

  it('crea la sesión de checkout con el reparto de comisión por defecto (10%)', async () => {
    const result = await useCase.execute('res-1', 'guest-1');

    expect(result).toEqual({
      paymentId: 'pay-1',
      checkoutUrl: 'https://stripe/cs_1',
    });
    expect(gateway.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 100, currency: 'eur' }),
    );
    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reservationId: 'res-1',
        amount: 100,
        platformFeeAmount: 10,
        hostPayoutAmount: 90,
        providerCheckoutSessionId: 'cs_1',
      }),
    );
  });

  it('respeta PLAZZA_PLATFORM_FEE_PERCENT si está configurado', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'PLAZZA_PLATFORM_FEE_PERCENT' ? 20 : undefined,
    );

    await useCase.execute('res-1', 'guest-1');

    expect(payments.create).toHaveBeenCalledWith(
      expect.objectContaining({ platformFeeAmount: 20, hostPayoutAmount: 80 }),
    );
  });

  it('falla si la reserva no es del guest que pide el checkout', async () => {
    reservations.findByIdForParticipant.mockResolvedValue(null);

    await expect(useCase.execute('res-1', 'otro-guest')).rejects.toBeInstanceOf(
      ReservationNotFoundError,
    );
  });

  it('falla si la reserva está cancelada', async () => {
    reservations.findByIdForParticipant.mockResolvedValue({
      ...reservation,
      status: 'CANCELLED',
    });

    await expect(useCase.execute('res-1', 'guest-1')).rejects.toBeInstanceOf(
      ReservationNotPayableError,
    );
  });

  it('falla si ya hay un pago que no está en FAILED (evita doble cobro)', async () => {
    payments.findByReservationId.mockResolvedValue({
      id: 'pay-0',
      status: 'PENDING',
    });

    await expect(useCase.execute('res-1', 'guest-1')).rejects.toBeInstanceOf(
      ReservationNotPayableError,
    );
  });

  it('permite reintentar el checkout si el pago anterior falló', async () => {
    payments.findByReservationId.mockResolvedValue({
      id: 'pay-0',
      status: 'FAILED',
    });

    const result = await useCase.execute('res-1', 'guest-1');
    expect(result.paymentId).toBe('pay-1');
  });
});
