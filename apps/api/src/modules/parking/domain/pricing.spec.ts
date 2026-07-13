import { calculateReservationTotal } from './pricing';
import { ParkingPriceOverride } from './entities/parking-price-override.entity';

function override(
  partial: Partial<ParkingPriceOverride> & { id: string },
): ParkingPriceOverride {
  return {
    parkingId: 'parking-1',
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-01-02'),
    pricePerDay: 100,
    label: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...partial,
  };
}

describe('calculateReservationTotal', () => {
  it('usa el precio base cuando no hay overrides', () => {
    const total = calculateReservationTotal(
      20,
      [],
      new Date('2026-03-01'),
      new Date('2026-03-04'),
    );
    expect(total).toBe(60); // 3 noches × 20
  });

  it('aplica el override solo a las noches que cubre', () => {
    const overrides = [
      override({
        id: 'ov-1',
        startDate: new Date('2026-03-02'),
        endDate: new Date('2026-03-03'),
        pricePerDay: 90,
      }),
    ];
    // Noches: 03-01 (base 20), 03-02 (override 90), 03-03 (base 20)
    const total = calculateReservationTotal(
      20,
      overrides,
      new Date('2026-03-01'),
      new Date('2026-03-04'),
    );
    expect(total).toBe(130);
  });

  it('con overrides solapados, gana el más reciente por createdAt', () => {
    const overrides = [
      override({
        id: 'ov-old',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        pricePerDay: 50,
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
      override({
        id: 'ov-new',
        startDate: new Date('2026-03-02'),
        endDate: new Date('2026-03-03'),
        pricePerDay: 200,
        createdAt: new Date('2026-01-02T00:00:00Z'),
      }),
    ];
    // 03-01 → ov-old (50), 03-02 → ov-new gana (200), 03-03/03-04 → ov-old (50)
    const total = calculateReservationTotal(
      20,
      overrides,
      new Date('2026-03-01'),
      new Date('2026-03-05'),
    );
    expect(total).toBe(50 + 200 + 50 + 50);
  });

  it('redondea a 2 decimales', () => {
    const total = calculateReservationTotal(
      33.333,
      [],
      new Date('2026-03-01'),
      new Date('2026-03-02'),
    );
    expect(total).toBe(33.33);
  });
});
