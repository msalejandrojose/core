import { Filter } from '../filter';
import { Limit } from '../limit';
import { Order } from '../order';
import { specToPrismaArgs } from './from-spec';

interface Demo {
  id: string;
  name: string;
  age: number;
  active: boolean;
}

describe('specToPrismaArgs', () => {
  it('spec vacía → where vacío, orderBy []', () => {
    expect(specToPrismaArgs<Demo>()).toEqual({ where: {}, orderBy: [] });
  });

  it('eq', () => {
    const filter = new Filter<Demo>().addEqualValue('name', 'Alice');
    expect(specToPrismaArgs({ filter }).where).toEqual({ name: 'Alice' });
  });

  it('ne', () => {
    const filter = new Filter<Demo>().addNotEqualValue('age', 30);
    expect(specToPrismaArgs({ filter }).where).toEqual({ age: { not: 30 } });
  });

  it('in / notIn', () => {
    const f1 = new Filter<Demo>().addIn('id', ['a', 'b']);
    expect(specToPrismaArgs({ filter: f1 }).where).toEqual({
      id: { in: ['a', 'b'] },
    });

    const f2 = new Filter<Demo>().addNotIn('id', ['x']);
    expect(specToPrismaArgs({ filter: f2 }).where).toEqual({
      id: { notIn: ['x'] },
    });
  });

  it('like — wildcards', () => {
    const ambos = new Filter<Demo>().addLike('name', '%foo%');
    expect(specToPrismaArgs({ filter: ambos }).where).toEqual({
      name: { contains: 'foo' },
    });

    const prefix = new Filter<Demo>().addLike('name', 'foo%');
    expect(specToPrismaArgs({ filter: prefix }).where).toEqual({
      name: { startsWith: 'foo' },
    });

    const suffix = new Filter<Demo>().addLike('name', '%foo');
    expect(specToPrismaArgs({ filter: suffix }).where).toEqual({
      name: { endsWith: 'foo' },
    });

    const exact = new Filter<Demo>().addLike('name', 'foo');
    expect(specToPrismaArgs({ filter: exact }).where).toEqual({
      name: { equals: 'foo' },
    });
  });

  it('gt / gte / lt / lte', () => {
    const f = new Filter<Demo>().addGreaterThan('age', 10);
    expect(specToPrismaArgs({ filter: f }).where).toEqual({ age: { gt: 10 } });

    const f2 = new Filter<Demo>().addGreaterOrEqual('age', 10);
    expect(specToPrismaArgs({ filter: f2 }).where).toEqual({
      age: { gte: 10 },
    });

    const f3 = new Filter<Demo>().addLessThan('age', 10);
    expect(specToPrismaArgs({ filter: f3 }).where).toEqual({ age: { lt: 10 } });

    const f4 = new Filter<Demo>().addLessOrEqual('age', 10);
    expect(specToPrismaArgs({ filter: f4 }).where).toEqual({
      age: { lte: 10 },
    });
  });

  it('rango compuesto: gt + lt sobre el mismo campo se mergean', () => {
    const f = new Filter<Demo>()
      .addGreaterOrEqual('age', 18)
      .addLessThan('age', 65);
    expect(specToPrismaArgs({ filter: f }).where).toEqual({
      age: { gte: 18, lt: 65 },
    });
  });

  it('isNull / isNotNull', () => {
    const f = new Filter<Demo>().addIsNull('name');
    expect(specToPrismaArgs({ filter: f }).where).toEqual({ name: null });

    const f2 = new Filter<Demo>().addIsNotNull('name');
    expect(specToPrismaArgs({ filter: f2 }).where).toEqual({
      name: { not: null },
    });
  });

  it('order pasa al orderBy', () => {
    const order = new Order<Demo>().addDesc('age').addAsc('name');
    expect(specToPrismaArgs({ order }).orderBy).toEqual([
      { age: 'desc' },
      { name: 'asc' },
    ]);
  });

  it('limit pasa take/skip', () => {
    expect(specToPrismaArgs({ limit: new Limit(20, 40) })).toEqual({
      where: {},
      orderBy: [],
      take: 20,
      skip: 40,
    });
  });

  it('limit page', () => {
    expect(specToPrismaArgs({ limit: Limit.page(3, 20) })).toEqual({
      where: {},
      orderBy: [],
      take: 20,
      skip: 40,
    });
  });

  it('spec completa', () => {
    const filter = new Filter<Demo>()
      .addEqualValue('active', true)
      .addLike('name', 'a%');
    const order = new Order<Demo>().addDesc('age');
    const limit = Limit.page(2, 10);

    expect(specToPrismaArgs({ filter, order, limit })).toEqual({
      where: { active: true, name: { startsWith: 'a' } },
      orderBy: [{ age: 'desc' }],
      take: 10,
      skip: 10,
    });
  });
});
