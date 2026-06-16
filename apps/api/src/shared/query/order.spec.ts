import { Order } from './order';

interface DemoEntity {
  id: string;
  name: string;
  createdAt: Date;
}

describe('Order', () => {
  it('arranca vacío', () => {
    const o = new Order<DemoEntity>();
    expect(o.isEmpty()).toBe(true);
    expect(o.items).toHaveLength(0);
  });

  it('chaining + orden de inserción', () => {
    const o = new Order<DemoEntity>()
      .addDesc('createdAt')
      .addAsc('name')
      .add('id', 'desc');

    expect(o.items).toEqual([
      { field: 'createdAt', direction: 'desc' },
      { field: 'name', direction: 'asc' },
      { field: 'id', direction: 'desc' },
    ]);
  });
});
