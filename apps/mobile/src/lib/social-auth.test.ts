import { describe, expect, it, vi } from 'vitest';

vi.mock('@capgo/capacitor-social-login', () => ({ SocialLogin: {} }));
import { isSocialLoginCancelled } from './social-auth';

const coded = (message: string, code: string) => Object.assign(new Error(message), { code });

describe('isSocialLoginCancelled', () => {
  it('cerrar la ventana de Google en la web cuenta como cancelar, no como error', () => {
    expect(isSocialLoginCancelled(coded('Popup closed', 'USER_CANCELLED'))).toBe(true);
    expect(isSocialLoginCancelled(new Error('Popup closed'))).toBe(true);
    expect(isSocialLoginCancelled(new Error('The window was closed'))).toBe(true);
    expect(isSocialLoginCancelled(new Error('access_denied'))).toBe(true);
  });

  it('los mensajes de cancelar de iOS y Android siguen valiendo', () => {
    expect(isSocialLoginCancelled(new Error('The user canceled the sign-in flow.'))).toBe(true);
    expect(isSocialLoginCancelled('User cancelled login')).toBe(true);
  });

  it('un fallo de verdad sí se enseña', () => {
    expect(isSocialLoginCancelled(new Error('redirect_uri not supported'))).toBe(false);
    expect(isSocialLoginCancelled(new Error('Network error'))).toBe(false);
    expect(isSocialLoginCancelled(null)).toBe(false);
  });
});
