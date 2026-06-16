import { Filter } from './filter';

interface DemoEntity {
  id: string;
  name: string;
  age: number;
  active: boolean;
  createdAt: Date;
}

describe('Filter', () => {
  it('arranca vacío', () => {
    const f = new Filter<DemoEntity>();
    expect(f.isEmpty()).toBe(true);
    expect(f.predicates).toHaveLength(0);
  });

  it('todos los add* son chainables y respetan el orden', () => {
    const f = new Filter<DemoEntity>()
      .addEqualValue('name', 'Alice')
      .addGreaterThan('age', 18)
      .addLessThan('age', 100);

    expect(f.isEmpty()).toBe(false);
    expect(f.predicates.map((p) => p.op)).toEqual(['eq', 'gt', 'lt']);
  });

  it('addEqualValue / addNotEqualValue', () => {
    const f = new Filter<DemoEntity>()
      .addEqualValue('name', 'Alice')
      .addNotEqualValue('id', 'x');
    expect(f.predicates).toEqual([
      { op: 'eq', field: 'name', value: 'Alice' },
      { op: 'ne', field: 'id', value: 'x' },
    ]);
  });

  it('addIn / addNotIn copian los arrays (no mantienen referencia)', () => {
    const values = ['a', 'b'];
    const f = new Filter<DemoEntity>().addIn('id', values);
    values.push('c'); // mutación externa
    const p = f.predicates[0];
    expect(p.op).toBe('in');
    expect((p as { values: string[] }).values).toEqual(['a', 'b']);
  });

  it('addLike', () => {
    const f = new Filter<DemoEntity>().addLike('name', '%alice%');
    expect(f.predicates[0]).toEqual({
      op: 'like',
      field: 'name',
      pattern: '%alice%',
    });
  });

  it('addIsNull / addIsNotNull', () => {
    const f = new Filter<DemoEntity>()
      .addIsNull('createdAt')
      .addIsNotNull('id');
    expect(f.predicates).toEqual([
      { op: 'isNull', field: 'createdAt' },
      { op: 'isNotNull', field: 'id' },
    ]);
  });
});
