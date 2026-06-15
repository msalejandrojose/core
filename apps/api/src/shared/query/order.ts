export interface OrderItem<T> {
  readonly field: keyof T;
  readonly direction: 'asc' | 'desc';
}

// Order genérico, builder chainable. Conserva el orden de inserción
// (primero añadido = primer criterio).
//
// Ejemplo:
//   new Order<User>().addDesc('createdAt').addAsc('email')
export class Order<T> {
  private readonly _items: OrderItem<T>[] = [];

  get items(): ReadonlyArray<OrderItem<T>> {
    return this._items;
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }

  add<K extends keyof T>(field: K, direction: 'asc' | 'desc'): this {
    this._items.push({ field, direction });
    return this;
  }

  addAsc<K extends keyof T>(field: K): this {
    return this.add(field, 'asc');
  }

  addDesc<K extends keyof T>(field: K): this {
    return this.add(field, 'desc');
  }
}
