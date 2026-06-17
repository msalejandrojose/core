/**
 * Extrae un mensaje legible del error que devuelve `openapi-fetch`. El
 * `DomainErrorFilter` del API responde un body `{ message, ... }`; si no hay
 * mensaje aprovechable se usa el fallback.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
    if (Array.isArray(message) && typeof message[0] === 'string') {
      return message.join(', ');
    }
  }
  return fallback;
}
