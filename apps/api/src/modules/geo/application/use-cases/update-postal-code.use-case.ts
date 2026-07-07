import { Inject, Injectable } from '@nestjs/common';
import { PostalCode } from '../../domain/entities/postal-code.entity';
import { MunicipalityNotFoundError } from '../../domain/errors/municipality-not-found.error';
import { PostalCodeAlreadyExistsError } from '../../domain/errors/postal-code-already-exists.error';
import { PostalCodeNotFoundError } from '../../domain/errors/postal-code-not-found.error';
import {
  MUNICIPALITY_REPOSITORY,
  type MunicipalityRepositoryPort,
} from '../ports/municipality-repository.port';
import {
  POSTAL_CODE_REPOSITORY,
  type PostalCodeRepositoryPort,
  type UpdatePostalCodePatch,
} from '../ports/postal-code-repository.port';

export interface UpdatePostalCodeInput {
  code?: string;
  municipalityId?: string;
}

@Injectable()
export class UpdatePostalCodeUseCase {
  constructor(
    @Inject(POSTAL_CODE_REPOSITORY)
    private readonly postalCodes: PostalCodeRepositoryPort,
    @Inject(MUNICIPALITY_REPOSITORY)
    private readonly municipalities: MunicipalityRepositoryPort,
  ) {}

  async execute(id: string, input: UpdatePostalCodeInput): Promise<PostalCode> {
    const existing = await this.postalCodes.findById(id);
    if (!existing) throw new PostalCodeNotFoundError(id);

    if (
      input.municipalityId !== undefined &&
      input.municipalityId !== existing.municipalityId
    ) {
      const municipality = await this.municipalities.findById(
        input.municipalityId,
      );
      if (!municipality)
        throw new MunicipalityNotFoundError(input.municipalityId);
    }

    const nextMunicipalityId = input.municipalityId ?? existing.municipalityId;
    const nextCode = input.code ?? existing.code;
    if (
      nextCode !== existing.code ||
      nextMunicipalityId !== existing.municipalityId
    ) {
      if (await this.postalCodes.existsCode(nextMunicipalityId, nextCode, id)) {
        throw new PostalCodeAlreadyExistsError(nextCode, nextMunicipalityId);
      }
    }

    const patch: UpdatePostalCodePatch = {
      code: input.code,
      municipalityId: input.municipalityId,
    };
    return this.postalCodes.update(id, patch);
  }
}
