/** Normaliza un email para deduplicación: trim + lowercase. `null` si vacío. */
export function normalizeEmail(
  email: string | null | undefined,
): string | null {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Normaliza un teléfono para dedupe: quita espacios y separadores comunes. */
export function normalizePhone(
  phone: string | null | undefined,
): string | null {
  if (!phone) return null;
  const trimmed = phone.replace(/[\s().-]/g, '');
  return trimmed.length > 0 ? trimmed : null;
}
