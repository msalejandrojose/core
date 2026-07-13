import { HandlePaymentWebhookUseCase } from './handle-payment-webhook.use-case';

describe('HandlePaymentWebhookUseCase', () => {
  let gateway: { parseWebhookEvent: jest.Mock };
  let payments: { findByCheckoutSessionId: jest.Mock; update: jest.Mock };
  let useCase: HandlePaymentWebhookUseCase;

  const payment = { id: 'pay-1', status: 'PENDING' };

  beforeEach(() => {
    gateway = { parseWebhookEvent: jest.fn() };
    payments = {
      findByCheckoutSessionId: jest.fn().mockResolvedValue(payment),
      update: jest.fn().mockResolvedValue({ ...payment, status: 'PAID' }),
    };
    useCase = new HandlePaymentWebhookUseCase(
      gateway as never,
      payments as never,
    );
  });

  it('marca el pago como PAID en checkout.completed', async () => {
    gateway.parseWebhookEvent.mockReturnValue({
      type: 'checkout.completed',
      sessionId: 'cs_1',
      paymentIntentId: 'pi_1',
      metadata: {},
    });

    const result = await useCase.execute(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ handled: true });
    expect(payments.update).toHaveBeenCalledWith(
      'pay-1',
      expect.objectContaining({
        status: 'PAID',
        providerPaymentIntentId: 'pi_1',
      }),
    );
  });

  it('marca el pago como FAILED en checkout.failed', async () => {
    gateway.parseWebhookEvent.mockReturnValue({
      type: 'checkout.failed',
      sessionId: 'cs_1',
      paymentIntentId: null,
      metadata: {},
    });

    await useCase.execute(Buffer.from('{}'), 'sig');

    expect(payments.update).toHaveBeenCalledWith(
      'pay-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });

  it('ignora eventos que el gateway no reconoce', async () => {
    gateway.parseWebhookEvent.mockReturnValue(null);

    const result = await useCase.execute(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ handled: false });
    expect(payments.update).not.toHaveBeenCalled();
  });

  it('ignora eventos de una sesión desconocida', async () => {
    payments.findByCheckoutSessionId.mockResolvedValue(null);
    gateway.parseWebhookEvent.mockReturnValue({
      type: 'checkout.completed',
      sessionId: 'cs_unknown',
      paymentIntentId: null,
      metadata: {},
    });

    const result = await useCase.execute(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ handled: false });
    expect(payments.update).not.toHaveBeenCalled();
  });

  it('es idempotente: no reprocesa un pago ya PAID', async () => {
    payments.findByCheckoutSessionId.mockResolvedValue({
      id: 'pay-1',
      status: 'PAID',
    });
    gateway.parseWebhookEvent.mockReturnValue({
      type: 'checkout.completed',
      sessionId: 'cs_1',
      paymentIntentId: 'pi_1',
      metadata: {},
    });

    const result = await useCase.execute(Buffer.from('{}'), 'sig');

    expect(result).toEqual({ handled: true });
    expect(payments.update).not.toHaveBeenCalled();
  });

  it('propaga el error si la firma del webhook no es válida', async () => {
    gateway.parseWebhookEvent.mockImplementation(() => {
      throw new Error('firma inválida');
    });

    await expect(useCase.execute(Buffer.from('{}'), 'bad-sig')).rejects.toThrow(
      'firma inválida',
    );
  });
});
