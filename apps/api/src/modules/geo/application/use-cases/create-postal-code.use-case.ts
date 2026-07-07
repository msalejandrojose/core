import { Inject, Injectable } from '@nestjs/common';
import { PostalCode } from '../../domain/entities/postal-code.entity';
import { MunicipalityNotFoundError } from '../../domain/errors/municipality-not-found.error';
import { PostalCodeAlreadyExistsError } from '../../domain/errors/postal-code-already-exists.error';
import {
  MUNICIPALITY_REPOSITORY,
  type MunicipalityRepositoryPort,
} from '../ports/municipality-repository.port';
import {
  POSTAL_CODE_REPOSITORY,
  type PostalCodeRepositoryPort,
} from '../ports/postal-code-repository.port';

export interface CreatePostalCodeInput {
  code: string;
  municipalityId: string;
}

@Injectable()
export class CreatePostalCodeUseCase {
  constructor(
    @Inject(POSTAL_CODE_REPOSITORY)
    private readonly postalCodes: PostalCodeRepositoryPort,
    @Inject(MUNICIPALITY_REPOSITORY)
    private readonly municipalities: MunicipalityRepositoryPort,
  ) {}

  async execute(input: CreatePostalCodeInput): Promise<PostalCode> {
    const municipality = await this.municipalities.findById(
      input.municipalityId,
    );
    if (!municipality)
      throw new MunicipalityNotFoundError(input.municipalityId);
    if (await this.postalCodes.existsCode(input.municipalityId, input.code)) {
      throw new PostalCodeAlreadyExistsError(input.code, input.municipalityId);
    }
    return this.postalCodes.create({
      code: input.code,
      municipalityId: input.municipalityId,
    });
  }
}
