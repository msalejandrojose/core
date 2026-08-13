export const GOOGLE_AUTH_CODE_EXCHANGER = Symbol('IAM_GOOGLE_AUTH_CODE_EXCHANGER');

export interface GoogleAuthCodeExchangerPort {
  /**
   * Canjea el `code` de autorización que Google mandó al callback por un ID
   * token, contra el endpoint de token de Google (flujo de servidor web,
   * cliente confidencial). Lanza `SocialAuthFailedError` si el canje falla.
   */
  exchange(code: string): Promise<string>;
}
