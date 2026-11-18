/**
 * Error del protocolo OAuth (RFC 6749 §5.2 / RFC 7591 §3.2.2). No pasa por el
 * filtro global de errores: el controlador lo devuelve tal cual, con el
 * formato `{ error, error_description }` que esperan los clientes OAuth.
 */
export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'unsupported_response_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'invalid_redirect_uri'
  | 'invalid_client_metadata'
  | 'invalid_token';

export class OAuthError extends Error {
  constructor(
    readonly code: OAuthErrorCode,
    readonly description: string,
    readonly status = 400,
  ) {
    super(description);
    this.name = 'OAuthError';
  }
}
