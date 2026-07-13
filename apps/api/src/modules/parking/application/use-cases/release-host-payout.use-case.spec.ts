import { ReleaseHostPayoutUseCase } from './release-host-payout.use-case';
import { HostPayoutNotEligibleError } from '../../domain/errors/host-payout-not-eligible.error';
import { PaymentNotFoundError } from '../../domain/errors/payment-not-found.error';

describe('ReleaseHostPayoutUseCase', () => {
  let payments: { findById: jest.Mock; update: jest.Mock };
  let useCase: ReleaseHostPayoutUseCase;

  beforeEach(() => {
    payments = {
      findById: jest.fn().mockResolvedValue({
        id: 'pay-1',
        status: 'PAID',
        hostPayoutStatus: 'PENDING',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'pay-1',
        status: 'PAID',
        hostPayoutStatus: 'RELEASED',
      }),
    };
    useCase = new ReleaseHostPayoutUseCase(payments as never);
  });

  it('marca la liquidación del host como RELEASED', async () => {
    const result = await useCase.execute('pay-1');

    expect(result.hostPayoutStatus).toBe('RELEASED');
    expect(payments.update).toHaveBeenCalledWith(
      'pay-1',
      expect.objectContaining({ hostPayoutStatus: 'RELEASED' }),
    );
  });

  it('falla si el pago no existe', async () => {
    payments.findById.mockResolvedValue(null);

    await expect(useCase.execute('pay-1')).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );
  });

  it('falla si el pago no está PAID', async () => {
    payments.findById.mockResolvedValue({
      id: 'pay-1',
      status: 'PENDING',
      hostPayoutStatus: 'PENDING',
    });

    await expect(useCase.execute('pay-1')).rejects.toBeInstanceOf(
      HostPayoutNotEligibleError,
    );
  });

  it('falla si ya se liquidó antes', async () => {
    payments.findById.mockResolvedValue({
      id: 'pay-1',
      status: 'PAID',
      hostPayoutStatus: 'RELEASED',
    });

    await expect(useCase.execute('pay-1')).rejects.toBeInstanceOf(
      HostPayoutNotEligibleError,
    );
  });
});
