import { Inject, Injectable } from '@nestjs/common';
import { TagNotFoundError } from '../../domain/errors/tag-not-found.error';
import {
  POST_TAG_REPOSITORY,
  type PostTagRepositoryPort,
} from '../ports/post-tag-repository.port';

@Injectable()
export class DeleteTagUseCase {
  constructor(
    @Inject(POST_TAG_REPOSITORY) private readonly tags: PostTagRepositoryPort,
  ) {}

  // El pivot post_tag_on_post cae por cascade al borrar la etiqueta.
  async execute(id: string): Promise<void> {
    const existing = await this.tags.findById(id);
    if (!existing) throw new TagNotFoundError(id);
    await this.tags.delete(id);
  }
}
