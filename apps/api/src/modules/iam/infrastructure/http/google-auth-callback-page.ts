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
export function renderGoogleAuthCallbackPage(
  ok: boolean,
  state: string,
  origin: 'GAME' | 'WEB' = 'GAME',
): string {
  if (origin === 'WEB') return renderWebCallbackPage(ok);
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

// Login con Google iniciado desde una página web que hace el polling (la
// pantalla de autorizar un conector OAuth): esa página sigue sola, así que
// aquí solo se avisa y se intenta cerrar la pestaña. Sin deep link al juego.
function renderWebCallbackPage(ok: boolean): string {
  const title = ok ? 'Sesión iniciada' : 'No se pudo iniciar sesión';
  const message = ok
    ? 'Ya puedes cerrar esta pestaña: la otra página continúa sola.'
    : 'Ha ocurrido un error al iniciar sesión con Google. Cierra esta pestaña y vuelve a intentarlo.';
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: #f2f2f7; color: #1c1c1e; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; text-align: center; padding: 24px; box-sizing: border-box; }
  @media (prefers-color-scheme: dark) { body { background: #000; color: #f2f2f7; } .card { background: #1c1c1e; } p { color: #98989f; } }
  .card { max-width: 360px; background: #fff; border-radius: 22px; padding: 24px; }
  h1 { font-size: 1.25rem; margin: 0 0 8px; }
  p { color: #6c6c70; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
  <script>${ok ? 'setTimeout(function () { window.close(); }, 800);' : ''}</script>
</body>
</html>`;
}
