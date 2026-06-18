import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { PostWithRelations } from '../../domain/entities/post.entity';
import {
  POST_REPOSITORY,
  type ListPostsAdminOptions,
  type PostRepositoryPort,
} from '../ports/post-repository.port';

@Injectable()
export class ListPostsUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
  ) {}

  // Listado de administración: todos los estados, cursor-paginado.
  execute(opts: ListPostsAdminOptions): Promise<CursorPage<PostWithRelations>> {
    return this.posts.listAdmin(opts);
  }
}
