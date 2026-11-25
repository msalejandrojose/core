// Worker `brio-api-edge`: Cloudflare (CDN + WAF) delante de la API en Cloud Run.
//
// Cloud Run enruta por la cabecera Host (`*.run.app`) y en el plan gratuito de
// Cloudflare no se puede reescribir el Host con Origin Rules, así que este
// Worker hace de proxy: recibe en el dominio propio (p. ej. api.brio.example)
// y reenvía a `ORIGIN_HOST`. El WAF y el rate limiting de la zona se aplican
// ANTES de llegar aquí.
//
// Añade dos cabeceras que la API entiende (apps/api/src/infrastructure/edge):
//   - x-origin-auth: secreto compartido → la API sabe que viene de Cloudflare.
//   - x-edge-client-ip: IP real del cliente (para el rate limiter de la API).
// Siempre se sobrescriben, así un cliente no puede colarlas.
//
// Gestionado por Terraform (infra/terraform/modules/cloudflare-edge).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const publicHost = url.host;
    url.protocol = 'https:';
    url.hostname = env.ORIGIN_HOST;
    url.port = '';

    const upstream = new Request(url.toString(), request);
    const clientIp = request.headers.get('cf-connecting-ip') ?? '';

    upstream.headers.set('x-origin-auth', env.ORIGIN_AUTH_SECRET);
    upstream.headers.set('x-edge-client-ip', clientIp);
    upstream.headers.set('x-forwarded-for', clientIp);
    upstream.headers.set('x-forwarded-host', publicHost);
    upstream.headers.set('x-forwarded-proto', 'https');

    // Las WebSockets (socket.io) pasan tal cual: fetch() devuelve el 101.
    return fetch(upstream);
  },
};
