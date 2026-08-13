// Página mínima que ve el jugador en el navegador del sistema tras el
// consentimiento de Google. No hay app ni deep link al otro lado: el cierre
// de la pestaña es la única acción que le queda al usuario, así que solo le
// avisamos de que puede volver al juego.
export function renderGoogleAuthCallbackPage(ok: boolean): string {
  const title = ok ? 'Sesión iniciada' : 'No se pudo iniciar sesión';
  const message = ok
    ? 'Ya puedes volver al juego, la sesión se ha iniciado correctamente.'
    : 'Ha ocurrido un error al iniciar sesión con Google. Vuelve al juego e inténtalo de nuevo.';

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
</style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
