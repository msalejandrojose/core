// Enum espejo del `PostStatus` de Prisma. Se declara aparte para que la capa
// `domain/` no dependa del cliente generado. Las reglas de transición del
// flujo editorial viven aquí (las usan los use cases publish/archive).

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export const POST_STATUSES: readonly PostStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
] as const;

/**
 * ¿Se puede publicar/programar un post que está en `from`?
 * - DRAFT → PUBLISHED | SCHEDULED
 * - SCHEDULED → PUBLISHED (re-programar también vale)
 * - ARCHIVED → PUBLISHED (re-publicar un archivado)
 * - PUBLISHED → PUBLISHED (idempotente, p.ej. cambiar `publishedAt`)
 */
export function canPublish(from: PostStatus): boolean {
  return (
    from === 'DRAFT' ||
    from === 'SCHEDULED' ||
    from === 'ARCHIVED' ||
    from === 'PUBLISHED'
  );
}

/**
 * ¿Se puede archivar un post que está en `from`? Cualquier estado salvo uno
 * ya archivado (archivar un archivado no es una transición válida).
 */
export function canArchive(from: PostStatus): boolean {
  return from !== 'ARCHIVED';
}
