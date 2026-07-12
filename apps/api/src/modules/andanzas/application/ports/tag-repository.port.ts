import { TagSuggestion } from '../../domain/tags/suggest-tags';
import { Tag } from '../../domain/entities/tag.entity';

export const TAG_REPOSITORY = Symbol('TAG_REPOSITORY');

export interface TagRepositoryPort {
  // Get-or-create atómico por nombre ya normalizado (evita duplicados por
  // condición de carrera; se apoya en el @unique de Tag.name).
  upsertByName(normalizedName: string): Promise<Tag>;
  // Candidatos para autocompletar: ya filtrados por prefijo en BBDD (no
  // trae la tabla entera), con su recuento de uso para poder ordenarlos.
  searchByPrefix(
    normalizedPrefix: string,
    limit: number,
  ): Promise<TagSuggestion[]>;
}
