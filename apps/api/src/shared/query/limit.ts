// Limit con paginación offset-based. `take` = cuántos coger, `skip` = offset.
//
// Para paginación 1-indexed usa `Limit.page(page, size)`.
//
// Ejemplos:
//   new Limit(20)            // primeros 20
//   new Limit(20, 40)        // 20 saltando 40
//   Limit.page(3, 20)        // página 3 de tamaño 20 → take=20, skip=40
export class Limit {
  constructor(
    public readonly take: number,
    public readonly skip: number = 0,
  ) {
    if (!Number.isFinite(take) || take < 0) {
      throw new Error(`Limit.take debe ser >= 0 (recibido ${take})`);
    }
    if (!Number.isFinite(skip) || skip < 0) {
      throw new Error(`Limit.skip debe ser >= 0 (recibido ${skip})`);
    }
  }

  static page(page: number, size: number): Limit {
    if (!Number.isInteger(page) || page < 1) {
      throw new Error(`Limit.page page debe ser entero >= 1 (recibido ${page})`);
    }
    if (!Number.isInteger(size) || size < 1) {
      throw new Error(`Limit.page size debe ser entero >= 1 (recibido ${size})`);
    }
    return new Limit(size, (page - 1) * size);
  }
}
