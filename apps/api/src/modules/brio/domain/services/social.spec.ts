import {
  canSeeActivity,
  challengeEnd,
  daysLeft,
  displayName,
  eventFrom,
  handleBase,
  rank,
  relationOf,
  streakDays,
  type SessionFact,
} from './social';

describe('social: identidad', () => {
  it('saca un nombre de usuario limpio del nombre o del correo', () => {
    expect(handleBase('Laura', 'Gómez', 'x@y.es')).toBe('lauragomez');
    expect(handleBase(null, null, 'Marcos.Runs+test@correo.es')).toBe(
      'marcos.runstest',
    );
    expect(handleBase('Al', null, 'a@b.es')).toBe('brioal');
  });

  it('usa el nombre real si lo hay', () => {
    expect(displayName('Laura', 'Gómez', 'lg')).toBe('Laura Gómez');
    expect(displayName(null, null, 'lg')).toBe('lg');
  });
});

describe('social: quién ve qué', () => {
  it('solo los amigos mutuos ven la actividad, y solo si se comparte', () => {
    expect(relationOf(false, true, true)).toBe('FRIENDS');
    expect(relationOf(false, true, false)).toBe('FOLLOWING');
    expect(relationOf(false, false, true)).toBe('FOLLOWS_ME');
    expect(relationOf(false, false, false)).toBe('NONE');
    expect(canSeeActivity('FRIENDS', true)).toBe(true);
    expect(canSeeActivity('FRIENDS', false)).toBe(false);
    expect(canSeeActivity('FOLLOWING', true)).toBe(false);
    expect(canSeeActivity('FOLLOWS_ME', true)).toBe(false);
    expect(canSeeActivity('SELF', false)).toBe(true);
  });
});

describe('social: logros', () => {
  const session = (over: Partial<SessionFact> = {}): SessionFact => ({
    id: 's1',
    userId: 'u1',
    startedAt: new Date('2026-11-12T07:00:00Z'),
    day: '2026-11-12',
    typeName: 'Correr',
    kind: 'RUN',
    durationSec: 5616,
    distanceM: 18000,
    ...over,
  });

  it('cuenta un entreno con distancia', () => {
    expect(eventFrom(session(), 20000)).toEqual({
      key: 's:s1',
      userId: 'u1',
      at: '2026-11-12T07:00:00.000Z',
      text: 'Correr de 18,0 km en 1 h 34 min.',
      badge: 'Correr',
      kind: 'goal',
    });
  });

  it('marca el récord cuando supera su distancia anterior', () => {
    expect(eventFrom(session(), 15000)).toMatchObject({
      badge: 'Récord',
      kind: 'pr',
      text: 'Correr de 18,0 km en 1 h 34 min. Su distancia más larga hasta ahora.',
    });
    // La primera vez no hay con qué comparar, y un paseo corto no es récord.
    expect(eventFrom(session(), null).kind).toBe('goal');
    expect(eventFrom(session({ distanceM: 2000 }), 1000).kind).toBe('goal');
  });

  it('sin distancia cuenta el tiempo', () => {
    expect(
      eventFrom(
        session({ typeName: 'Pesas', distanceM: null, durationSec: 2700 }),
        null,
      ).text,
    ).toBe('Pesas · 45 min.');
  });

  it('cuenta la racha hasta hoy o hasta ayer', () => {
    expect(
      streakDays(['2026-11-11', '2026-11-12', '2026-11-13'], '2026-11-13'),
    ).toBe(3);
    expect(streakDays(['2026-11-11', '2026-11-12'], '2026-11-13')).toBe(2);
    expect(streakDays(['2026-11-10'], '2026-11-13')).toBe(0);
  });
});

describe('social: retos', () => {
  it('ordena y comparte puesto en los empates', () => {
    expect(
      rank([
        { userId: 'b', value: 3 },
        { userId: 'a', value: 4 },
        { userId: 'c', value: 3 },
        { userId: 'd', value: 0 },
      ]),
    ).toEqual([
      { userId: 'a', value: 4, position: 1 },
      { userId: 'b', value: 3, position: 2 },
      { userId: 'c', value: 3, position: 2 },
      { userId: 'd', value: 0, position: 4 },
    ]);
  });

  it('calcula el final y los días que quedan', () => {
    expect(challengeEnd('2026-11-13', 1)).toBe('2026-11-19');
    expect(challengeEnd('2026-11-13', 4)).toBe('2026-12-10');
    expect(daysLeft('2026-11-19', '2026-11-17')).toBe(3);
    expect(daysLeft('2026-11-19', '2026-11-19')).toBe(1);
    expect(daysLeft('2026-11-19', '2026-11-20')).toBe(0);
  });
});
