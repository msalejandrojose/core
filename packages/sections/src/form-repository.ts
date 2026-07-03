import type {
  FormRepository,
  FormRepositoryOption,
  FormRepositoryQuery,
  FormRepositoryResult,
} from '@core/forms';
import type { Section, SectionScope } from './types.js';

/**
 * Fuente de datos de secciones que consume el adapter. La app la implementa con
 * su repositorio real (Prisma en la API, memoria en tests). Idealmente devuelve
 * solo secciones activas.
 */
export interface SectionSource {
  listSections(): Promise<Section[]> | Section[];
}

export interface SectionFormRepositoryOptions {
  /** Nombre del entity con el que se registra (por defecto `"Section"`). */
  entity?: string;
  /** Cómo construir la etiqueta de cada opción (por defecto el `name`). */
  label?: (section: Section) => string;
}

function matches(section: Section, query?: FormRepositoryQuery): boolean {
  if (!query) return true;

  const scope = query.filters?.['scope'] as SectionScope | undefined;
  if (scope && section.scope !== scope) return false;

  if (query.search && query.search.trim()) {
    const needle = query.search.trim().toLowerCase();
    const haystack = `${section.name} ${section.code}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

/**
 * Registra `Section` como `FormRepository` de `@core/forms` (§5 del SPEC): así
 * un formulario declarativo puede tener un selector de secciones
 * (`{ type: 'select', source: { repository: 'Section' } }`) que se resuelve con
 * `resolveFormRepositories`.
 *
 * Es agnóstico de la persistencia: recibe una `SectionSource` inyectada.
 * Soporta búsqueda (`search`), filtro por `scope` y paginación; cada opción
 * lleva `parentValue` para selectores en cascada por jerarquía.
 */
export function createSectionFormRepository(
  source: SectionSource,
  options: SectionFormRepositoryOptions = {},
): FormRepository {
  const entity = options.entity ?? 'Section';
  const labelOf = options.label ?? ((section: Section) => section.name);

  const toOption = (section: Section): FormRepositoryOption => ({
    value: section.id,
    label: labelOf(section),
    parentValue: section.parentId ?? null,
  });

  return {
    entity,

    async list(query?: FormRepositoryQuery): Promise<FormRepositoryResult> {
      const all = await source.listSections();
      const filtered = all.filter((section) => matches(section, query));
      const total = filtered.length;

      const { page, pageSize } = query ?? {};
      const paged =
        page && pageSize
          ? filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
          : filtered;

      return { options: paged.map(toOption), total };
    },

    async getByValue(value: string): Promise<FormRepositoryOption | null> {
      const all = await source.listSections();
      const found = all.find((section) => section.id === value);
      return found ? toOption(found) : null;
    },
  };
}
