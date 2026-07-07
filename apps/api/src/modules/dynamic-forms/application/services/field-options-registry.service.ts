import { Inject, Injectable, Optional } from '@nestjs/common';
import { FieldOptionsEntityNotFoundError } from '../../domain/errors/field-options-entity-not-found.error';
import {
  FIELD_OPTIONS_REPOSITORIES,
  type FieldOptionsRepository,
} from '../ports/field-options-repository.port';

/**
 * Índice `entity → FieldOptionsRepository`. Recoge todos los repositorios
 * registrados con el token multi-provider y los expone por nombre de entidad.
 */
@Injectable()
export class FieldOptionsRegistry {
  private readonly byEntity = new Map<string, FieldOptionsRepository>();

  constructor(
    @Optional()
    @Inject(FIELD_OPTIONS_REPOSITORIES)
    repositories: FieldOptionsRepository[] = [],
  ) {
    for (const repo of repositories) {
      this.byEntity.set(repo.entity, repo);
    }
  }

  /** Entidades disponibles, ordenadas. */
  entities(): string[] {
    return [...this.byEntity.keys()].sort();
  }

  /** Repositorio de una entidad, o lanza si no está registrada. */
  get(entity: string): FieldOptionsRepository {
    const repo = this.byEntity.get(entity);
    if (!repo) throw new FieldOptionsEntityNotFoundError(entity);
    return repo;
  }
}
