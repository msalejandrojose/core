// Pantalla de consentimiento OAuth (`GET /v1/oauth/authorize`). La sirve la
// API en su propio origen: el usuario inicia sesión con lo que ya existe
// (`POST /v1/auth/login`, o Google con `google/start` + sondeo de
// `google/session`) y la página manda el access token de IAM a
// `POST /v1/oauth/authorize/decision`, que responde a dónde volver.
//
// El token de la app nunca sale de esta página: al cliente OAuth solo le
// llega un código de un solo uso. Todo lo que viene del cliente (nombre,
// parámetros) se escapa.

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );

/** JSON seguro dentro de <script> (sin `</script>` ni `<!--`). */
const jsonForScript = (v: unknown) =>
  JSON.stringify(v).replace(/</g, '\\u003c');

const STYLE = `
  :root { --bg:#f2f2f7; --card:#fff; --ink:#1c1c1e; --muted:#6c6c70; --line:#e5e5ea; --fill:#f2f2f7; --tint:#0064d2; --tint-soft:#eaf2fd; --ok:#1f7a35; --danger:#d70015; }
  @media (prefers-color-scheme: dark) { :root { --bg:#000; --card:#1c1c1e; --ink:#f2f2f7; --muted:#98989f; --line:#38383a; --fill:#2c2c2e; --tint:#3e9bff; --tint-soft:#0a2a4d; --ok:#30d158; --danger:#ff453a; } }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px 16px; background:var(--bg); color:var(--ink); font:16px/1.4 -apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, system-ui, sans-serif; }
  main { width:100%; max-width:400px; display:flex; flex-direction:column; gap:14px; }
  .brand { font-size:28px; font-weight:800; letter-spacing:-0.5px; text-align:center; }
  .brand span { color:var(--tint); }
  .card { background:var(--card); border-radius:22px; padding:20px; display:flex; flex-direction:column; gap:14px; }
  h1 { margin:0; font-size:20px; line-height:26px; font-weight:700; }
  .muted { color:var(--muted); font-size:14px; margin:0; }
  ul { margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:8px; }
  li { display:flex; gap:10px; padding:12px; border-radius:14px; background:var(--fill); font-size:14px; }
  li::before { content:'✓'; color:var(--ok); font-weight:700; }
  label { display:flex; flex-direction:column; gap:4px; font-size:13px; color:var(--muted); }
  input { height:48px; padding:0 14px; border:0; border-radius:12px; background:var(--fill); color:var(--ink); font:inherit; font-size:17px; outline:none; }
  input:focus { box-shadow: inset 0 0 0 2px var(--tint); }
  button { min-height:50px; border:0; border-radius:14px; font:inherit; font-size:17px; font-weight:600; cursor:pointer; }
  .primary { background:var(--tint); color:#fff; }
  .secondary { background:var(--tint-soft); color:var(--tint); }
  .ghost { background:transparent; color:var(--muted); min-height:44px; font-weight:400; }
  button:disabled { opacity:.5; cursor:default; }
  .or { display:flex; align-items:center; gap:10px; color:var(--muted); font-size:13px; }
  .or::before, .or::after { content:''; flex:1; height:1px; background:var(--line); }
  .error { color:var(--danger); font-size:14px; margin:0; min-height:0; }
  .who { padding:12px; border-radius:14px; background:var(--tint-soft); color:var(--tint); font-size:14px; }
  [hidden] { display:none !important; }
`;

export function renderOAuthAuthorizePage(input: {
  clientName: string;
  /** Host de la redirect URI: el nombre lo elige el cliente, el host no se puede falsear. */
  redirectHost: string;
  scopeLabels: string[];
  params: Record<string, string | null>;
}): string {
  const name = esc(input.clientName);
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="referrer" content="no-referrer" />
<title>Conectar ${name} con Brío</title>
<style>${STYLE}</style>
</head>
<body>
<main>
  <div class="brand">Br<span>í</span>o</div>
  <section class="card">
    <h1>${name} quiere conectarse a tu cuenta</h1>
    <p class="muted">Podrá hacer esto en tu nombre:</p>
    <ul>${input.scopeLabels.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="muted">Al terminar volverás a <strong>${esc(input.redirectHost)}</strong>. Puedes desconectarlo cuando quieras; nunca verá tu contraseña.</p>
  </section>

  <section class="card" id="login">
    <button type="button" class="secondary" id="google">Continuar con Google</button>
    <div class="or">o con tu correo</div>
    <form id="form">
      <div style="display:flex;flex-direction:column;gap:10px">
        <label>Correo<input type="email" name="email" autocomplete="username" required /></label>
        <label>Contraseña<input type="password" name="password" autocomplete="current-password" required /></label>
        <button type="submit" class="primary" id="submit">Entrar y permitir</button>
      </div>
    </form>
    <p class="error" id="error" role="alert"></p>
  </section>

  <section class="card" id="google-wait" hidden>
    <p class="muted">Termina de iniciar sesión con Google en la otra pestaña. Esta página seguirá sola.</p>
    <button type="button" class="ghost" id="google-cancel">Cancelar</button>
  </section>

  <button type="button" class="ghost" id="deny">No permitir</button>
</main>
<script>
(function () {
  var params = ${jsonForScript(input.params)};
  var $ = function (id) { return document.getElementById(id); };
  var err = $('error');
  function busy(on) { ['submit', 'google', 'deny'].forEach(function (id) { $(id).disabled = on; }); }
  function fail(msg) { err.textContent = msg; busy(false); }

  function decide(approve, accessToken) {
    busy(true);
    return fetch('/v1/oauth/authorize/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ params: params, approve: approve, accessToken: accessToken || null }),
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (res.ok && res.body.redirectTo) { window.location.replace(res.body.redirectTo); return; }
        fail((res.body && (res.body.error_description || res.body.message)) || 'No se pudo completar la autorización.');
      })
      .catch(function () { fail('Sin conexión. Inténtalo de nuevo.'); });
  }

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    err.textContent = '';
    busy(true);
    var f = e.target;
    fetch('/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: f.email.value.trim(), password: f.password.value }),
    })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (!res.ok || !res.body.accessToken) {
          var code = res.body && res.body.code;
          fail(code === 'EMAIL_NOT_VERIFIED' ? 'Verifica tu correo antes de conectar.' : 'Correo o contraseña incorrectos.');
          return;
        }
        decide(true, res.body.accessToken);
      })
      .catch(function () { fail('Sin conexión. Inténtalo de nuevo.'); });
  });

  var polling = null;
  function stopGoogle() { if (polling) clearInterval(polling); polling = null; $('google-wait').hidden = true; $('login').hidden = false; busy(false); }
  $('google').addEventListener('click', function () {
    err.textContent = '';
    // La pestaña se abre ya en el clic (si no, el navegador la bloquea) y luego se le pone la URL.
    var tab = window.open('', '_blank');
    busy(true);
    fetch('/v1/auth/google/start?origin=web', { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (s) {
        if (!s.authUrl || !s.sessionId) throw new Error();
        if (tab) tab.location.href = s.authUrl; else window.open(s.authUrl, '_blank');
        $('login').hidden = true; $('google-wait').hidden = false;
        var tries = 0;
        polling = setInterval(function () {
          if (++tries > 150) { stopGoogle(); fail('Se agotó el tiempo con Google.'); return; }
          fetch('/v1/auth/google/session/' + encodeURIComponent(s.sessionId))
            .then(function (r) { return r.json(); })
            .then(function (st) {
              if (st.status === 'READY' && st.accessToken) { clearInterval(polling); polling = null; try { tab && tab.close(); } catch (_) {} decide(true, st.accessToken); }
              else if (st.status === 'FAILED') { stopGoogle(); fail('No se pudo iniciar sesión con Google.'); }
            })
            .catch(function () {});
        }, 2000);
      })
      .catch(function () { try { tab && tab.close(); } catch (_) {} fail('Google no está disponible ahora mismo.'); });
  });
  $('google-cancel').addEventListener('click', stopGoogle);
  $('deny').addEventListener('click', function () { decide(false, null); });
})();
</script>
</body>
</html>`;
}

/** Error que no se puede devolver al cliente (cliente o redirect URI no válidos). */
export function renderOAuthErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>No se puede conectar</title><style>${STYLE}</style></head>
<body><main><div class="brand">Br<span>í</span>o</div><section class="card"><h1>No se puede conectar</h1>
<p class="muted">${esc(message)}</p><p class="muted">Vuelve a la aplicación que te ha traído aquí e inténtalo de nuevo.</p></section></main></body></html>`;
}
