/**
 * Deriva un slug URL-safe a partir de un texto libre: minúsculas, sin acentos,
 * espacios → guiones y limpieza de caracteres no permitidos. El API también
 * normaliza/valida el slug, pero generarlo en el cliente da feedback inmediato
 * y un valor por defecto editable en el editor de posts.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // solo alfanumérico, espacio y guion
    .replace(/[\s_-]+/g, '-') // colapsa separadores en un guion
    .replace(/^-+|-+$/g, ''); // sin guiones al inicio/fin
}

/** Patrón aceptado por el API para slugs (minúsculas, números y guiones). */
export const SLUG_PATTERN = /^[a-z0-9-]+$/;
