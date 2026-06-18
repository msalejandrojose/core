import { DomainError } from '../../../../shared/errors/domain-error';
import { PostStatus } from '../value-objects/post-status.vo';

export class InvalidPostTransitionError extends DomainError {
  constructor(from: PostStatus, to: PostStatus) {
    super(
      'INVALID_POST_TRANSITION',
      `Transición de estado no permitida: ${from} → ${to}.`,
      { from, to },
    );
  }
}
