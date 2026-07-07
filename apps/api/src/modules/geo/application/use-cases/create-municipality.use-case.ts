import { Inject, Injectable } from '@nestjs/common';
import { Municipality } from '../../domain/entities/municipality.entity';
import { MunicipalityAlreadyExistsError } from '../../domain/errors/municipality-already-exists.error';
import { ProvinceNotFoundError } from '../../domain/errors/province-not-found.error';
import {
  MUNICIPALITY_REPOSITORY,
  type MunicipalityRepositoryPort,
} from '../ports/municipality-repository.port';
import {
  PROVINCE_REPOSITORY,
  type ProvinceRepositoryPort,
} from '../ports/province-repository.port';

export interface CreateMunicipalityInput {
  code: string;
  name: string;
  provinceId: string;
}

@Injectable()
export class CreateMunicipalityUseCase {
  constructor(
    @Inject(MUNICIPALITY_REPOSITORY)
    private readonly municipalities: MunicipalityRepositoryPort,
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinces: ProvinceRepositoryPort,
  ) {}

  async execute(input: CreateMunicipalityInput): Promise<Municipality> {
    const province = await this.provinces.findById(input.provinceId);
    if (!province) throw new ProvinceNotFoundError(input.provinceId);
    if (await this.municipalities.existsCode(input.provinceId, input.code)) {
      throw new MunicipalityAlreadyExistsError(input.code, input.provinceId);
    }
    return this.municipalities.create({
      code: input.code,
      name: input.name,
      provinceId: input.provinceId,
    });
  }
}
