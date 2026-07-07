import { Inject, Injectable } from '@nestjs/common';
import { PostalCode } from '../../domain/entities/postal-code.entity';
import { PostalCodeNotFoundError } from '../../domain/errors/postal-code-not-found.error';
import {
  POSTAL_CODE_REPOSITORY,
  type PostalCodeRepositoryPort,
} from '../ports/postal-code-repository.port';

@Injectable()
export class GetPostalCodeUseCase {
  constructor(
    @Inject(POSTAL_CODE_REPOSITORY)
    private readonly postalCodes: PostalCodeRepositoryPort,
  ) {}

  async execute(id: string): Promise<PostalCode> {
    const postalCode = await this.postalCodes.findById(id);
    if (!postalCode) throw new PostalCodeNotFoundError(id);
    return postalCode;
  }
}
