import { Inject, Injectable } from '@nestjs/common';
import { Province } from '../../domain/entities/province.entity';
import { ProvinceNotFoundError } from '../../domain/errors/province-not-found.error';
import {
  PROVINCE_REPOSITORY,
  type ProvinceRepositoryPort,
} from '../ports/province-repository.port';

@Injectable()
export class GetProvinceUseCase {
  constructor(
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinces: ProvinceRepositoryPort,
  ) {}

  async execute(id: string): Promise<Province> {
    const province = await this.provinces.findById(id);
    if (!province) throw new ProvinceNotFoundError(id);
    return province;
  }
}
