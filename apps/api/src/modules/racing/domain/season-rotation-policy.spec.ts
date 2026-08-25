import { Season } from './entities/season.entity';
import {
  SEASON_DURATION_DAYS,
  nextSeasonName,
  seasonNeedsRotation,
} from './season-rotation-policy';

describe('seasonNeedsRotation (TASK-228)', () => {
  it('no rota una temporada recién empezada', () => {
    const season = new Season('s1', 'Temporada 1', new Date('2026-01-01'), null);
    expect(seasonNeedsRotation(season, new Date('2026-01-02'))).toBe(false);
  });

  it('no rota justo un instante antes de cumplir la duración', () => {
    const season = new Season('s1', 'Temporada 1', new Date('2026-01-01T00:00:00Z'), null);
    const almostDue = new Date('2026-01-01T00:00:00Z');
    almostDue.setUTCDate(almostDue.getUTCDate() + SEASON_DURATION_DAYS);
    almostDue.setUTCMilliseconds(almostDue.getUTCMilliseconds() - 1);

    expect(seasonNeedsRotation(season, almostDue)).toBe(false);
  });

  it('rota justo al cumplir la duración', () => {
    const season = new Season('s1', 'Temporada 1', new Date('2026-01-01T00:00:00Z'), null);
    const dueAt = new Date('2026-01-01T00:00:00Z');
    dueAt.setUTCDate(dueAt.getUTCDate() + SEASON_DURATION_DAYS);

    expect(seasonNeedsRotation(season, dueAt)).toBe(true);
  });

  it('rota con margen si ha pasado mucho más tiempo', () => {
    const season = new Season('s1', 'Temporada 1', new Date('2026-01-01'), null);
    expect(seasonNeedsRotation(season, new Date('2026-06-01'))).toBe(true);
  });

  it('una temporada ya cerrada nunca "necesita" rotar', () => {
    const season = new Season(
      's1',
      'Temporada 1',
      new Date('2026-01-01'),
      new Date('2026-01-15'),
    );
    expect(seasonNeedsRotation(season, new Date('2027-01-01'))).toBe(false);
  });
});

describe('nextSeasonName (TASK-228)', () => {
  it('sin temporada anterior, empieza en la primera', () => {
    expect(nextSeasonName(null)).toBe('Temporada 1');
  });

  it('incrementa el número de la temporada anterior', () => {
    const previous = new Season('s1', 'Temporada 3', new Date(), null);
    expect(nextSeasonName(previous)).toBe('Temporada 4');
  });

  it('con un nombre que no sigue el patrón, vuelve a empezar en la primera', () => {
    const previous = new Season('s1', 'Verano 2026', new Date(), null);
    expect(nextSeasonName(previous)).toBe('Temporada 1');
  });
});
