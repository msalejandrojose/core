import { Invitation } from '../entities/invitation.entity';
import {
  canCreateInvitation,
  computeExpiresAt,
  isInvitationValid,
} from './invitation-rules';

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: 'inv-1',
    code: 'ABCD2345',
    createdByUserId: 'user-1',
    usedByUserId: null,
    expiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('computeExpiresAt', () => {
  it('por defecto caduca a los 14 días', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    expect(computeExpiresAt(createdAt)).toEqual(new Date('2026-01-15T00:00:00Z'));
  });
});

describe('isInvitationValid', () => {
  const now = new Date('2026-01-10T00:00:00Z');

  it('válida si no se ha usado y no ha caducado', () => {
    const invitation = makeInvitation({ expiresAt: new Date('2026-02-01T00:00:00Z') });
    expect(isInvitationValid(invitation, now)).toBe(true);
  });

  it('válida sin fecha de caducidad', () => {
    expect(isInvitationValid(makeInvitation({ expiresAt: null }), now)).toBe(true);
  });

  it('inválida si ya se ha usado', () => {
    expect(isInvitationValid(makeInvitation({ usedByUserId: 'user-2' }), now)).toBe(false);
  });

  it('inválida si ha caducado', () => {
    const invitation = makeInvitation({ expiresAt: new Date('2026-01-05T00:00:00Z') });
    expect(isInvitationValid(invitation, now)).toBe(false);
  });
});

describe('canCreateInvitation', () => {
  it('permite crear por debajo del límite', () => {
    expect(canCreateInvitation(4)).toBe(true);
  });

  it('bloquea al llegar al límite', () => {
    expect(canCreateInvitation(5)).toBe(false);
  });

  it('respeta un límite custom', () => {
    expect(canCreateInvitation(2, 3)).toBe(true);
    expect(canCreateInvitation(3, 3)).toBe(false);
  });
});
