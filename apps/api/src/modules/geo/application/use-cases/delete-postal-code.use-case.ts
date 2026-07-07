import { Inject, Injectable } from '@nestjs/common';
import { PostalCodeNotFoundError } from '../../domain/errors/postal-code-not-found.error';
import {
  POSTAL_CODE_REPOSITORY,
  type PostalCodeRepositoryPort,
} from '../ports/postal-code-repository.port';

@Injectable()
export class DeletePostalCodeUseCase {
  constructor(
    @Inject(POSTAL_CODE_REPOSITORY)
    private readonly postalCodes: PostalCodeRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.postalCodes.findById(id);
    if (!existing) throw new PostalCodeNotFoundError(id);
    await this.postalCodes.delete(id);
  }
}
