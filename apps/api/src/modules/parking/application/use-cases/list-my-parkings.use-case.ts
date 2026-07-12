import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Parking } from '../../domain/entities/parking.entity';
import {
  PARKING_REPOSITORY,
  type ListMyParkingsOptions,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

@Injectable()
export class ListMyParkingsUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  execute(opts: ListMyParkingsOptions): Promise<CursorPage<Parking>> {
    return this.parkings.list(opts);
  }
}
