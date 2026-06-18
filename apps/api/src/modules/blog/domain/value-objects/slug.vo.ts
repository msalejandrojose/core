// Normaliza/valida slugs en kebab-case. Vive en `domain/` y no depende de
// nada externo. Un slug es un identificador legible para URLs: solo
// minúsculas ASCII, dígitos y guiones, sin guiones al inicio/fin ni dobles.

const MAX_SLUG_LENGTH = 180;

// Rango Unicode de marcas diacríticas combinables (acentos sueltos tras NFD).
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Convierte un texto arbitrario (p.ej. el título de un post) en un slug
 * kebab-case: quita acentos, pasa a minúsculas y reemplaza todo lo que no
 * sea `[a-z0-9]` por un único guion.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '') // quita diacríticos (á → a)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');
}

/** Comprueba que un string ya tiene forma de slug válido. */
export function isValidSlug(slug: string): boolean {
  return (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= MAX_SLUG_LENGTH
  );
}

/**
 * Resuelve el slug definitivo a partir de un slug pedido (opcional) y un
 * título de fallback. Si el pedido no es válido, lo normaliza con `slugify`.
 */
export function resolveSlug(
  requested: string | undefined | null,
  fallbackFrom: string,
): string {
  const candidate =
    requested && requested.trim().length > 0 ? requested : fallbackFrom;
  return isValidSlug(candidate) ? candidate : slugify(candidate);
}
