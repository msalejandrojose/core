import { FieldOptionsEntityNotFoundError } from '../../domain/errors/field-options-entity-not-found.error';
import {
  type FieldOptionsRepository,
  type FieldOptionsResult,
} from '../ports/field-options-repository.port';
import { FieldOptionsRegistry } from './field-options-registry.service';

function fakeRepo(entity: string): FieldOptionsRepository {
  return {
    entity,
    list: (): Promise<FieldOptionsResult> => Promise.resolve({ options: [] }),
    getByValue: () => Promise.resolve(null),
  };
}

describe('FieldOptionsRegistry', () => {
  it('indexa los repositorios por entidad y los lista ordenados', () => {
    const registry = new FieldOptionsRegistry([
      fakeRepo('Role'),
      fakeRepo('Country'),
    ]);
    expect(registry.entities()).toEqual(['Country', 'Role']);
    expect(registry.get('Role').entity).toBe('Role');
  });

  it('lanza FieldOptionsEntityNotFoundError si la entidad no existe', () => {
    const registry = new FieldOptionsRegistry([fakeRepo('Role')]);
    expect(() => registry.get('Nope')).toThrow(FieldOptionsEntityNotFoundError);
  });

  it('tolera cero repositorios registrados', () => {
    const registry = new FieldOptionsRegistry();
    expect(registry.entities()).toEqual([]);
  });
});
