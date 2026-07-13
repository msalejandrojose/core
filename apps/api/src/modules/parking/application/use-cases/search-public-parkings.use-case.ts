import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { Parking } from '../../domain/entities/parking.entity';
import { haversineDistanceKm } from '../../domain/geo';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepositoryPort,
} from '../ports/reservation-repository.port';

const DEFAULT_RADIUS_KM = 15;
/** Sobre-fetch cuando hay filtro geográfico: filtrar por radio reduce el
 * resultado, así que se pide más de lo que se va a devolver para no acabar
 * con páginas cortas de forma innecesaria (mismo compromiso ya asumido por
 * el filtro de fechas: no hay garantía exacta de tamaño de página). */
const GEO_FETCH_MULTIPLIER = 4;

export interface SearchPublicParkingsInput {
  limit: number;
  cursor?: string;
  q?: string;
  /** Si se pasan ambas, filtra fuera las plazas sin disponibilidad en el rango. */
  startDate?: Date;
  endDate?: Date;
  /** Búsqueda por ubicación: centro + radio (km, por defecto 15). Requiere `lng`. */
  lat?: number;
  /** Requiere `lat`. */
  lng?: number;
  radiusKm?: number;
}

export interface PublicParkingResult extends Parking {
  /** Solo presente cuando la búsqueda se hizo con `lat`/`lng`. */
  distanceKm?: number;
}

/** Buscador público (landing). Solo plazas `PUBLISHED`, con anti-solape opcional por fechas y filtro opcional por ubicación. */
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
  ): Promise<CursorPage<PublicParkingResult>> {
    const hasGeoFilter = input.lat !== undefined && input.lng !== undefined;

    const page = await this.parkings.searchPublished({
      limit: hasGeoFilter ? input.limit * GEO_FETCH_MULTIPLIER : input.limit,
      cursor: input.cursor,
      q: input.q,
    });

    let items: PublicParkingResult[] = page.items;

    if (input.startDate && input.endDate) {
      const availability = await Promise.all(
        items.map((p) =>
          this.reservations.hasOverlap(p.id, input.startDate!, input.endDate!),
        ),
      );
      items = items.filter((_, i) => !availability[i]);
    }

    if (hasGeoFilter) {
      const { lat, lng } = input;
      const radiusKm = input.radiusKm ?? DEFAULT_RADIUS_KM;
      items = items
        .map((p) => ({
          ...p,
          distanceKm: haversineDistanceKm(lat!, lng!, p.latitude, p.longitude),
        }))
        .filter((p) => p.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, input.limit);
    }

    return { ...page, items };
  }
}
