import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostTag } from '../../domain/entities/post-tag.entity';
import {
  POST_TAG_REPOSITORY,
  type ListTagsOptions,
  type PostTagRepositoryPort,
} from '../ports/post-tag-repository.port';

@Injectable()
export class ListTagsUseCase {
  constructor(
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepositoryPort,
  ) {}

  // Admin: offset-paginado, filtro `nameContains`.
  execute(opts: ListTagsOptions): Promise<PaginatedResult<PostTag>> {
    return this.tags.list(opts);
  }

  // Público: solo etiquetas con contenido publicado.
  listPublic(): Promise<PostTag[]> {
    return this.tags.listPublic();
  }
}
