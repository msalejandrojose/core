import { CreateReviewUseCase } from './create-review.use-case';
import { ReservationNotFoundError } from '../../domain/errors/reservation-not-found.error';
import { ReviewAlreadyExistsError } from '../../domain/errors/review-already-exists.error';
import { ReviewNotEligibleError } from '../../domain/errors/review-not-eligible.error';

describe('CreateReviewUseCase', () => {
  let reservations: { findByIdForParticipant: jest.Mock };
  let reviews: { findByReservationAndRole: jest.Mock; create: jest.Mock };
  let useCase: CreateReviewUseCase;

  const completedReservation = {
    id: 'res-1',
    guestUserId: 'guest-1',
    status: 'CONFIRMED',
    endDate: new Date('2020-01-01'), // en el pasado
  };

  beforeEach(() => {
    reservations = {
      findByIdForParticipant: jest.fn().mockResolvedValue(completedReservation),
    };
    reviews = {
      findByReservationAndRole: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'review-1' }),
    };
    useCase = new CreateReviewUseCase(reservations as never, reviews as never);
  });

  it('crea la reseña del guest sobre la plaza', async () => {
    const result = await useCase.execute({
      reservationId: 'res-1',
      authorUserId: 'guest-1',
      rating: 5,
      comment: 'Genial',
    });

    expect(result).toEqual({ id: 'review-1' });
    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({ authorRole: 'GUEST', rating: 5 }),
    );
  });

  it('crea la reseña del host sobre el guest', async () => {
    await useCase.execute({
      reservationId: 'res-1',
      authorUserId: 'host-1',
      rating: 4,
      comment: null,
    });

    expect(reviews.create).toHaveBeenCalledWith(
      expect.objectContaining({ authorRole: 'HOST', rating: 4 }),
    );
  });

  it('falla si el usuario no participa en la reserva', async () => {
    reservations.findByIdForParticipant.mockResolvedValue(null);

    await expect(
      useCase.execute({
        reservationId: 'res-1',
        authorUserId: 'otro',
        rating: 3,
        comment: null,
      }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);
  });

  it('falla si la reserva no está CONFIRMED', async () => {
    reservations.findByIdForParticipant.mockResolvedValue({
      ...completedReservation,
      status: 'PENDING',
    });

    await expect(
      useCase.execute({
        reservationId: 'res-1',
        authorUserId: 'guest-1',
        rating: 3,
        comment: null,
      }),
    ).rejects.toBeInstanceOf(ReviewNotEligibleError);
  });

  it('falla si la estancia todavía no ha terminado', async () => {
    reservations.findByIdForParticipant.mockResolvedValue({
      ...completedReservation,
      endDate: new Date('2099-01-01'),
    });

    await expect(
      useCase.execute({
        reservationId: 'res-1',
        authorUserId: 'guest-1',
        rating: 3,
        comment: null,
      }),
    ).rejects.toBeInstanceOf(ReviewNotEligibleError);
  });

  it('falla si ya existe una reseña de ese autor para esa reserva', async () => {
    reviews.findByReservationAndRole.mockResolvedValue({ id: 'existing' });

    await expect(
      useCase.execute({
        reservationId: 'res-1',
        authorUserId: 'guest-1',
        rating: 3,
        comment: null,
      }),
    ).rejects.toBeInstanceOf(ReviewAlreadyExistsError);
  });
});
