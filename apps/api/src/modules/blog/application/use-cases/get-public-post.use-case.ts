import { Inject, Injectable } from '@nestjs/common';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { PostNotFoundError } from '../../domain/errors/post-not-found.error';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
} from '../ports/post-repository.port';

@Injectable()
export class GetPublicPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
  ) {}

  // Detalle público por slug. 404 si no está visible. Incrementa `viewCount`
  // de forma best-effort (no bloquea ni rompe la respuesta si falla).
  async execute(slug: string): Promise<PostWithRelations> {
    const post = await this.posts.findVisibleBySlug(slug);
    if (!post) throw new PostNotFoundError(slug);

    void this.posts.incrementViewCount(post.id).catch(() => undefined);

    return post;
  }
}
