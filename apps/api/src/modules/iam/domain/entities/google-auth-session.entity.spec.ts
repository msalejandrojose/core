import { GoogleAuthSession } from './google-auth-session.entity';

function session(expiresAt: Date): GoogleAuthSession {
  return new GoogleAuthSession(
    'session-1',
    'state-1',
    'PENDING',
    null,
    null,
    null,
    expiresAt,
  );
}

describe('GoogleAuthSession.isExpired', () => {
  it('no está expirada antes de expiresAt', () => {
    const s = session(new Date('2026-08-13T12:05:00.000Z'));
    expect(s.isExpired(new Date('2026-08-13T12:00:00.000Z'))).toBe(false);
  });

  it('está expirada justo después de expiresAt', () => {
    const s = session(new Date('2026-08-13T12:00:00.000Z'));
    expect(s.isExpired(new Date('2026-08-13T12:00:00.001Z'))).toBe(true);
  });

  it('no está expirada exactamente en expiresAt', () => {
    const s = session(new Date('2026-08-13T12:00:00.000Z'));
    expect(s.isExpired(new Date('2026-08-13T12:00:00.000Z'))).toBe(false);
  });
});
