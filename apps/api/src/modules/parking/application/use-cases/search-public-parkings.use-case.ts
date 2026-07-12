import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Parking } from '../../domain/entities/parking.entity';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

export interface SearchPublicParkingsInput {
  limit: number;
  cursor?: string;
  q?: string;
  /** Si se pasan ambas, filtra fuera las plazas sin disponibilidad en el rango. */
  startDate?: Date;
  endDate?: Date;
}

/** Buscador público (landing). Solo plazas `PUBLISHED`, con anti-solape opcional por fechas. */
@Injectable()
export class SearchPublicParkingsUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepositoryPort,
  ) {}

  async execute(
    input: SearchPublicParkingsInput,
  ): Promise<CursorPage<Parking>> {
    const page = await this.parkings.searchPublished({
      limit: input.limit,
      cursor: input.cursor,
      q: input.q,
    });

    if (!input.startDate || !input.endDate) return page;

    const availability = await Promise.all(
      page.items.map((p) =>
        this.reservations.hasOverlap(p.id, input.startDate!, input.endDate!),
      ),
    );
    return {
      ...page,
      items: page.items.filter((_, i) => !availability[i]),
    };
  }
}
