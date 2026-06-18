import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { PostWithRelations } from '../../domain/entities/post.entity';
import {
  POST_REPOSITORY,
  type ListPostsPublicOptions,
  type PostRepositoryPort,
} from '../ports/post-repository.port';

@Injectable()
export class ListPublishedPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
  ) {}

  // Listado público: solo contenido visible (PUBLISHED o SCHEDULED vencido),
  // orden `publishedAt DESC`, cursor-paginado.
  execute(
    opts: ListPostsPublicOptions,
  ): Promise<CursorPage<PostWithRelations>> {
    return this.posts.listPublic(opts);
  }
}
