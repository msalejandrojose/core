import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Parking } from '../../domain/entities/parking.entity';
import {
  PARKING_REPOSITORY,
  type ListAllParkingsOptions,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

/** Backoffice: todas las plazas, de cualquier host (moderación). */
@Injectable()
export class ListAllParkingsUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
  ) {}

  execute(opts: ListAllParkingsOptions): Promise<CursorPage<Parking>> {
    return this.parkings.listAll(opts);
  }
}
