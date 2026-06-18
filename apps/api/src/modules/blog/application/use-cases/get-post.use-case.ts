import { Inject, Injectable } from '@nestjs/common';
import { PostWithRelations } from '../../domain/entities/post.entity';
import { PostNotFoundError } from '../../domain/errors/post-not-found.error';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
} from '../ports/post-repository.port';

@Injectable()
export class GetPostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
  ) {}

  // Detalle de administración por id (incluye borradores).
  async execute(id: string): Promise<PostWithRelations> {
    const post = await this.posts.findById(id);
    if (!post) throw new PostNotFoundError(id);
    return post;
  }
}
