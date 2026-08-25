// Página que ve el jugador en el navegador del sistema tras el consentimiento
// de Google. El botón "Volver al juego" es un deep link (`ajracing://...`):
// si el juego lo tiene registrado (Android/iOS con el addon instalado), el
// SO trae la app al primer plano directamente. Es aditivo, no un reemplazo
// del polling — si el enlace no hace nada (desktop, SO sin la app, addon
// todavía no instalado), el polling de `GET /auth/google/session/:id` sigue
// siendo quien de verdad detecta que la sesión quedó lista.
//
// Sin token en el enlace a propósito: el juego ya tiene `sessionId` en
// memoria desde que abrió el navegador, así que el deep link solo hace falta
// como señal de "despierta y comprueba ahora" — nada sensible que pueda
// quedar en el histórico de enlaces del sistema operativo.
export function renderGoogleAuthCallbackPage(ok: boolean, state: string): string {
  const title = ok ? 'Sesión iniciada' : 'No se pudo iniciar sesión';
  const message = ok
    ? 'Ya puedes volver al juego, la sesión se ha iniciado correctamente.'
    : 'Ha ocurrido un error al iniciar sesión con Google. Vuelve al juego e inténtalo de nuevo.';
  const deepLink = `ajracing://auth/google-callback?state=${encodeURIComponent(state)}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #f1f5f9; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 24px; box-sizing: border-box; }
  .card { max-width: 360px; }
  h1 { font-size: 1.25rem; margin-bottom: 8px; }
  p { color: #94a3b8; }
  a.button { display: inline-block; margin-top: 20px; padding: 12px 28px; border-radius: 8px; background: #f1f5f9; color: #0f172a; text-decoration: none; font-weight: 600; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="button" href="${deepLink}">Volver al juego</a>
  </div>
</body>
</html>`;
}
