import { renderGoogleAuthCallbackPage } from './google-auth-callback-page';

describe('renderGoogleAuthCallbackPage', () => {
  it('desde el juego: deep link y «Volver al juego», como siempre', () => {
    const html = renderGoogleAuthCallbackPage(true, 'st');
    expect(html).toContain('ajracing://auth/google-callback?state=st');
    expect(html).toContain('Volver al juego');
  });

  it('desde la web: sin deep link ni juego, y cierra la pestaña si fue bien', () => {
    const ok = renderGoogleAuthCallbackPage(true, 'st', 'WEB');
    expect(ok).not.toContain('ajracing://');
    expect(ok).not.toMatch(/juego/i);
    expect(ok).toContain('Ya puedes cerrar esta pestaña');
    expect(ok).toContain('window.close()');

    const ko = renderGoogleAuthCallbackPage(false, 'st', 'WEB');
    expect(ko).toContain('No se pudo iniciar sesión');
    expect(ko).not.toContain('window.close()');
  });
});
