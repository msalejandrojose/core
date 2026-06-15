import type { Filter } from './filter';
import type { Limit } from './limit';
import type { Order } from './order';

// Spec genérica que combina filter + order + limit. Es el contrato uniforme
// con el que todos los repositories aceptan queries.
//
// Todos los campos son opcionales — `getRows({})` devuelve todo (con cuidado
// — usa `limit` para no traerte millones de filas).
export interface FindSpec<T> {
  filter?: Filter<T>;
  order?: Order<T>;
  limit?: Limit;
}
