// Resultado normalizado de verificar un token/código de un proveedor social.
// Ambos verificadores (Google/Facebook) devuelven esta misma forma para que
// `ResolveSocialUserUseCase` no conozca los detalles de cada proveedor.
export interface SocialProfile {
  /** `sub` (Google) o `id` (Facebook) — identificador estable del proveedor. */
  providerId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}
