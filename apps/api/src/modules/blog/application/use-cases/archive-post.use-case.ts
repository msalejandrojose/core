import { Inject, Injectable } from '@nestjs/common';
import { isVisible } from '@core/shared-types';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { InvalidPostTransitionError } from '../../domain/errors/invalid-post-transition.error';
import { PostNotFoundError } from '../../domain/errors/post-not-found.error';
import { canArchive } from '../../domain/value-objects/post-status.vo';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
} from '../ports/post-repository.port';
import {
  DEPLOY_TRIGGER,
  type DeployTriggerPort,
} from '../ports/deploy-trigger.port';

@Injectable()
export class ArchivePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
    @Inject(DEPLOY_TRIGGER) private readonly deploy: DeployTriggerPort,
  ) {}

  async execute(id: string): Promise<PostWithRelations> {
    const existing = await this.posts.findById(id);
    if (!existing) throw new PostNotFoundError(id);
    if (!canArchive(existing.status)) {
      throw new InvalidPostTransitionError(existing.status, 'ARCHIVED');
    }
    const archived = await this.posts.setStatus(id, 'ARCHIVED');

    // Retirar un post visible también debe quitarlo de la web ya desplegada.
    if (isVisible(existing.status, existing.publishedAt)) {
      await this.deploy.trigger(`post:archived:${archived.slug}`);
    }

    return archived;
  }
}
