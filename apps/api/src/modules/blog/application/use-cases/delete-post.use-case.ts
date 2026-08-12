import { Inject, Injectable } from '@nestjs/common';
import { isVisible } from '@core/shared-types';
import { PostNotFoundError } from '../../domain/errors/post-not-found.error';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
} from '../ports/post-repository.port';
import {
  DEPLOY_TRIGGER,
  type DeployTriggerPort,
} from '../ports/deploy-trigger.port';

@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
    @Inject(DEPLOY_TRIGGER) private readonly deploy: DeployTriggerPort,
  ) {}

  // Borrado físico (el pivot de etiquetas cae por cascade). Para "retirar sin
  // perder" está `archive`.
  async execute(id: string): Promise<void> {
    const existing = await this.posts.findById(id);
    if (!existing) throw new PostNotFoundError(id);
    await this.posts.delete(id);

    if (isVisible(existing.status, existing.publishedAt)) {
      await this.deploy.trigger(`post:deleted:${existing.slug}`);
    }
  }
}
