import { Inject, Injectable } from '@nestjs/common';
import { Municipality } from '../../domain/entities/municipality.entity';
import { MunicipalityAlreadyExistsError } from '../../domain/errors/municipality-already-exists.error';
import { MunicipalityNotFoundError } from '../../domain/errors/municipality-not-found.error';
import { ProvinceNotFoundError } from '../../domain/errors/province-not-found.error';
import {
  MUNICIPALITY_REPOSITORY,
  type MunicipalityRepositoryPort,
  type UpdateMunicipalityPatch,
} from '../ports/municipality-repository.port';
import {
  PROVINCE_REPOSITORY,
  type ProvinceRepositoryPort,
} from '../ports/province-repository.port';

export interface UpdateMunicipalityInput {
  code?: string;
  name?: string;
  provinceId?: string;
}

@Injectable()
export class UpdateMunicipalityUseCase {
  constructor(
    @Inject(MUNICIPALITY_REPOSITORY)
    private readonly municipalities: MunicipalityRepositoryPort,
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinces: ProvinceRepositoryPort,
  ) {}

  async execute(
    id: string,
    input: UpdateMunicipalityInput,
  ): Promise<Municipality> {
    const existing = await this.municipalities.findById(id);
    if (!existing) throw new MunicipalityNotFoundError(id);

    if (
      input.provinceId !== undefined &&
      input.provinceId !== existing.provinceId
    ) {
      const province = await this.provinces.findById(input.provinceId);
      if (!province) throw new ProvinceNotFoundError(input.provinceId);
    }

    const nextProvinceId = input.provinceId ?? existing.provinceId;
    const nextCode = input.code ?? existing.code;
    if (nextCode !== existing.code || nextProvinceId !== existing.provinceId) {
      if (await this.municipalities.existsCode(nextProvinceId, nextCode, id)) {
        throw new MunicipalityAlreadyExistsError(nextCode, nextProvinceId);
      }
    }

    const patch: UpdateMunicipalityPatch = {
      code: input.code,
      name: input.name,
      provinceId: input.provinceId,
    };
    return this.municipalities.update(id, patch);
  }
}
