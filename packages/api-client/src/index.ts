export { createApiClient } from './client';
export type { ApiClient, ApiClientOptions } from './client';

// Tipos del schema OpenAPI generado, para que las apps consumidoras puedan
// referirse a los DTOs por nombre (p. ej. components['schemas']['UserResponseDto']).
export type { components, paths, operations } from './generated/schema';
