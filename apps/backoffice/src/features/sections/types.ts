// Re-export del tipo canónico para no romper imports relativos previos
// (`./types`). Las nuevas referencias deberían importar directamente de
// `@core/sections`.
export type { SectionTreeNode } from '@core/sections';
