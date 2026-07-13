import { calculateCommissionSplit } from './commission';

describe('calculateCommissionSplit', () => {
  it('reparte el importe según el porcentaje de comisión', () => {
    expect(calculateCommissionSplit(100, 10)).toEqual({
      platformFeeAmount: 10,
      hostPayoutAmount: 90,
    });
  });

  it('redondea a 2 decimales', () => {
    expect(calculateCommissionSplit(33.33, 15)).toEqual({
      platformFeeAmount: 5,
      hostPayoutAmount: 28.33,
    });
  });

  it('con comisión 0, todo el importe es para el host', () => {
    expect(calculateCommissionSplit(50, 0)).toEqual({
      platformFeeAmount: 0,
      hostPayoutAmount: 50,
    });
  });
});
