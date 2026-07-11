import { canFollow, canViewProfile } from './follow-rules';

describe('canFollow', () => {
  it('permite seguir a otro usuario', () => {
    expect(canFollow('user-1', 'user-2')).toBe(true);
  });

  it('no permite seguirse a uno mismo', () => {
    expect(canFollow('user-1', 'user-1')).toBe(false);
  });
});

describe('canViewProfile', () => {
  it('en el MVP cualquier perfil es visible (no hay cuentas privadas)', () => {
    expect(canViewProfile()).toBe(true);
  });
});
