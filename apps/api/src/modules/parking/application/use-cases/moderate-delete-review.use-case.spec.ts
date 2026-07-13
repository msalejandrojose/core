import { ModerateDeleteReviewUseCase } from './moderate-delete-review.use-case';
import { ReviewNotFoundError } from '../../domain/errors/review-not-found.error';

describe('ModerateDeleteReviewUseCase', () => {
  let reviews: { findById: jest.Mock; delete: jest.Mock };
  let useCase: ModerateDeleteReviewUseCase;

  beforeEach(() => {
    reviews = {
      findById: jest.fn().mockResolvedValue({ id: 'review-1' }),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    useCase = new ModerateDeleteReviewUseCase(reviews as never);
  });

  it('elimina la reseña si existe', async () => {
    await useCase.execute('review-1');
    expect(reviews.delete).toHaveBeenCalledWith('review-1');
  });

  it('falla si la reseña no existe', async () => {
    reviews.findById.mockResolvedValue(null);

    await expect(useCase.execute('review-1')).rejects.toBeInstanceOf(
      ReviewNotFoundError,
    );
    expect(reviews.delete).not.toHaveBeenCalled();
  });
});
