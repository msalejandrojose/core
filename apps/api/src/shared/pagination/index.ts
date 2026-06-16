// Tipos para ports/repositorios (capa de dominio/application).
export * from './pagination.types';

// Codec del cursor opaco.
export * from './cursor.codec';

// Errores de dominio relacionados con paginación.
export * from './errors/invalid-cursor.error';

// DTOs HTTP (query + response + meta) — solo capa de infrastructure.
export * from './dto/cursor-pagination-query.dto';
export * from './dto/offset-pagination-query.dto';
export * from './dto/pagination-meta.dto';
export * from './dto/paginated-response.dto';
export * from './dto/sort.dto';

// Builders para envolver `Page<T>` en `{ data, meta }`.
export * from './pagination.builders';
