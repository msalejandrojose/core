import { Inject, Injectable } from '@nestjs/common';
import {
  PlaceCandidate,
  SITE_PLACE_SEARCH,
  type SitePlaceSearchPort,
} from '../ports/site-place-search.port';

const MIN_QUERY_LENGTH = 2;

@Injectable()
export class SearchSitePlacesUseCase {
  constructor(
    @Inject(SITE_PLACE_SEARCH) private readonly search: SitePlaceSearchPort,
  ) {}

  execute(query: string): Promise<PlaceCandidate[]> {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) return Promise.resolve([]);
    return this.search.search(trimmed);
  }
}
