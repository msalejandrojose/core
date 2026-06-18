import { Inject, Injectable } from '@nestjs/common';
import { PostNotFoundError } from '../../domain/errors/post-not-found.error';
import {
  POST_REPOSITORY,
  type PostRepositoryPort,
} from '../ports/post-repository.port';

@Injectable()
export class DeletePostUseCase {
  constructor(
    @Inject(POST_REPOSITORY) private readonly posts: PostRepositoryPort,
  ) {}

  // Borrado físico (el pivot de etiquetas cae por cascade). Para "retirar sin
  // perder" está `archive`.
  async execute(id: string): Promise<void> {
    const existing = await this.posts.findById(id);
    if (!existing) throw new PostNotFoundError(id);
    await this.posts.delete(id);
  }
}
