import { Inject, Injectable } from '@nestjs/common';
import { ProvinceNotFoundError } from '../../domain/errors/province-not-found.error';
import {
  PROVINCE_REPOSITORY,
  type ProvinceRepositoryPort,
} from '../ports/province-repository.port';

@Injectable()
export class DeleteProvinceUseCase {
  constructor(
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinces: ProvinceRepositoryPort,
  ) {}

  // Borrar una provincia arrastra sus municipios y códigos postales (cascada).
  async execute(id: string): Promise<void> {
    const existing = await this.provinces.findById(id);
    if (!existing) throw new ProvinceNotFoundError(id);
    await this.provinces.delete(id);
  }
}
