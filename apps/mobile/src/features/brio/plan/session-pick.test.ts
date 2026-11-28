import { describe, expect, it } from 'vitest';
import type { PlanFavorite, PlanTemplate } from './plan.api';
import { favoriteForm, favoriteMeta, hasDistance, isFavoriteSelected, selectionKey } from './session-pick';

const fav = (c: Partial<PlanFavorite>): PlanFavorite => ({
  key: 't:f7',
  routineId: null,
  templateCode: 'f7',
  title: 'Fútbol 7',
  kind: 'OTHER',
  load: 'HIGH',
  durationMin: 60,
  distanceM: null,
  times: 8,
  lastDay: '2026-11-20',
  ...c,
});
const templates: PlanTemplate[] = [
  { code: 'f7', title: 'Fútbol 7', short: 'Fútbol 7', kind: 'OTHER', load: 'HIGH', durationMin: 60, distanceM: null, structure: null },
  { code: 'series', title: 'Series 6 × 800 m', short: 'Series', kind: 'RUN', load: 'HIGH', durationMin: 50, distanceM: 9000, structure: { reps: 6 } },
];

describe('elegir la sesión del día', () => {
  it('sabe qué está elegido', () => {
    expect(selectionKey('r1', 'gym')).toBe('r:r1');
    expect(selectionKey(null, 'gym')).toBe('t:gym');
    expect(selectionKey(null, null)).toBeNull();
    const sel = { routineId: null, templateCode: 'f7', title: 'Fútbol 7' };
    expect(isFavoriteSelected(fav({}), sel)).toBe(true);
    expect(isFavoriteSelected(fav({ key: 'r:r1', routineId: 'r1' }), sel)).toBe(false);
    expect(isFavoriteSelected(fav({ key: 'n:pachanga', templateCode: null, title: 'Pachanga' }), { ...sel, templateCode: null, title: 'pachanga ' })).toBe(true);
  });

  it('un favorito rellena la sesión con lo de siempre', () => {
    expect(favoriteForm(fav({ durationMin: 75 }), templates)).toMatchObject({ templateCode: 'f7', kind: 'OTHER', load: 'HIGH', minutes: '75', reps: null });
    expect(favoriteForm(fav({ key: 't:series', templateCode: 'series', kind: 'RUN', durationMin: null, distanceM: 9000 }), templates)).toMatchObject({
      minutes: '50',
      km: '9',
      reps: 6,
    });
    // Una plantilla que ya no existe no se guarda.
    expect(favoriteForm(fav({ templateCode: 'vieja' }), templates).templateCode).toBeNull();
  });

  it('enseña veces, duración y distancia', () => {
    expect(favoriteMeta({ times: 12, durationMin: 60, distanceM: null })).toBe('12 veces · 1 h');
    expect(favoriteMeta({ times: 1, durationMin: 45, distanceM: 8500 })).toBe('1 vez · 45 min · 8,5 km');
    expect(hasDistance('RUN')).toBe(true);
    expect(hasDistance('STRENGTH')).toBe(false);
  });
});
