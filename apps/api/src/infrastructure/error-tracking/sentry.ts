import * as Sentry from '@sentry/node';

let initialized = false;

// Sin `SENTRY_DSN` no hace nada — así dev/CI/tests no necesitan configurarlo.
// Llamar lo antes posible en `main.ts`, antes de `NestFactory.create`.
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Solo error tracking, sin tracing de performance (evita overhead/coste
    // de más instrumentación de la que este spec pide).
    tracesSampleRate: 0,
  });
  initialized = true;
}

export interface SentryErrorContext {
  errorId: string;
  code: string;
  path?: string;
  method?: string;
  userId?: string;
  requestId?: string;
}

// Solo la llama `AppExceptionFilter` para los niveles `error`/`critical`
// (errores no controlados) — `warn`/`info` son ruido esperado, no se envían.
export function captureException(
  exception: unknown,
  context: SentryErrorContext,
): void {
  if (!initialized) return;

  Sentry.withScope((scope) => {
    scope.setTag('errorId', context.errorId);
    scope.setTag('code', context.code);
    if (context.requestId) scope.setTag('requestId', context.requestId);
    if (context.userId) scope.setUser({ id: context.userId });
    scope.setContext('request', {
      path: context.path,
      method: context.method,
    });
    Sentry.captureException(exception);
  });
}
