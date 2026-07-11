import { normalizeTagName } from './normalize-tag-name';

// Límite de tags por sitio: evita listas interminables o spam de etiquetas
// en un mismo sitio. Decisión de producto, no técnica.
export const MAX_TAGS_PER_SITE = 8;

// Cuántas sugerencias como máximo se muestran en el autocompletado.
export const MAX_TAG_SUGGESTIONS = 8;

export interface TagSuggestion {
  id: string;
  name: string;
  usageCount: number; // nº de Site que ya usan este tag — pesa el orden de sugerencias
}

// Autocompletado: dado lo que el usuario va escribiendo, sugiere tags ya
// existentes que empiecen por ese texto (match de prefijo, no substring —
// evita ruido con coincidencias a mitad de palabra) para que reutilice uno
// existente en vez de crear un duplicado. Ordenadas por más usadas primero
// y, a igualdad de uso, alfabéticamente.
export function suggestTags(
  query: string,
  existingTags: readonly TagSuggestion[],
  limit: number = MAX_TAG_SUGGESTIONS,
): TagSuggestion[] {
  const normalizedQuery = normalizeTagName(query);
  if (normalizedQuery === '') return [];

  return existingTags
    .filter((tag) => tag.name.startsWith(normalizedQuery))
    .sort((a, b) => b.usageCount - a.usageCount || a.name.localeCompare(b.name))
    .slice(0, limit);
}

// True si `existingTags` ya contiene un tag cuyo nombre normalizado coincide
// exactamente con `rawName` — en ese caso hay que reutilizar ese tag
// (upsert) en vez de crear uno nuevo.
export function findExactMatch(
  rawName: string,
  existingTags: readonly TagSuggestion[],
): TagSuggestion | null {
  const normalized = normalizeTagName(rawName);
  return existingTags.find((tag) => tag.name === normalized) ?? null;
}
