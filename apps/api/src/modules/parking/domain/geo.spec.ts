import { haversineDistanceKm } from './geo';

describe('haversineDistanceKm', () => {
  it('es 0 para el mismo punto', () => {
    expect(haversineDistanceKm(40.4168, -3.7038, 40.4168, -3.7038)).toBe(0);
  });

  it('calcula ~aprox la distancia Madrid–Barcelona (~505 km)', () => {
    const km = haversineDistanceKm(40.4168, -3.7038, 41.3874, 2.1686);
    expect(km).toBeGreaterThan(490);
    expect(km).toBeLessThan(520);
  });
});
