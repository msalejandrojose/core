import { Inject, Injectable } from '@nestjs/common';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { InvalidPostTransitionError } from '../../domain/errors/invalid-post-transition.error';
import { PostNotFoundError } from '../../domain/errors/post-not-found.error';
import { canArchive } from '../../domain/value-objects/post-status.vo';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
} from '../ports/post-repository.port';

@Injectable()
export class ArchivePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
  ) {}

  async execute(id: string): Promise<PostWithRelations> {
    const existing = await this.posts.findById(id);
    if (!existing) throw new PostNotFoundError(id);
    if (!canArchive(existing.status)) {
      throw new InvalidPostTransitionError(existing.status, 'ARCHIVED');
    }
    return this.posts.setStatus(id, 'ARCHIVED');
  }
}
