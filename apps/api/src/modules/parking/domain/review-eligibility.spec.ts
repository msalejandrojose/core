import { isReservationReviewable } from './review-eligibility';

describe('isReservationReviewable', () => {
  const now = new Date('2026-03-10');

  it('es reseñable si está CONFIRMED y la estancia ya pasó', () => {
    expect(
      isReservationReviewable(
        { status: 'CONFIRMED', endDate: new Date('2026-03-01') },
        now,
      ),
    ).toBe(true);
  });

  it('no es reseñable si la estancia todavía no ha terminado', () => {
    expect(
      isReservationReviewable(
        { status: 'CONFIRMED', endDate: new Date('2026-03-20') },
        now,
      ),
    ).toBe(false);
  });

  it('no es reseñable si no está CONFIRMED', () => {
    expect(
      isReservationReviewable(
        { status: 'PENDING', endDate: new Date('2026-03-01') },
        now,
      ),
    ).toBe(false);
    expect(
      isReservationReviewable(
        { status: 'CANCELLED', endDate: new Date('2026-03-01') },
        now,
      ),
    ).toBe(false);
  });
});
