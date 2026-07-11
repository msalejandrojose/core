import { canAddToGroup } from './group-rules';

describe('canAddToGroup', () => {
  it('permite añadir a alguien a quien ya se sigue', () => {
    expect(canAddToGroup(['user-2', 'user-3'], 'user-2')).toBe(true);
  });

  it('no permite añadir a alguien a quien no se sigue', () => {
    expect(canAddToGroup(['user-2', 'user-3'], 'user-4')).toBe(false);
  });

  it('lista de seguidos vacía → nunca se puede añadir', () => {
    expect(canAddToGroup([], 'user-2')).toBe(false);
  });
});
