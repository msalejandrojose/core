import { Inject, Injectable } from '@nestjs/common';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { InvalidPostTransitionError } from '../../domain/errors/invalid-post-transition.error';
import { PostNotFoundError } from '../../domain/errors/post-not-found.error';
import { canPublish } from '../../domain/value-objects/post-status.vo';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
} from '../ports/post-repository.port';

export interface PublishPostInput {
  // Opcional. Si es una fecha futura, el post queda SCHEDULED; si es pasada,
  // vacía o ausente, se publica ya (PUBLISHED con `publishedAt = now()`).
  publishedAt?: Date | null;
}

@Injectable()
export class PublishPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
  ) {}

  async execute(
    id: string,
    input: PublishPostInput = {},
  ): Promise<PostWithRelations> {
    const existing = await this.posts.findById(id);
    if (!existing) throw new PostNotFoundError(id);

    const now = new Date();
    const requested = input.publishedAt ?? null;
    const isFuture = requested !== null && requested.getTime() > now.getTime();
    const targetStatus = isFuture ? 'SCHEDULED' : 'PUBLISHED';

    if (!canPublish(existing.status)) {
      throw new InvalidPostTransitionError(existing.status, targetStatus);
    }

    const publishedAt = isFuture ? requested : (requested ?? now);
    return this.posts.setStatus(id, targetStatus, publishedAt);
  }
}
