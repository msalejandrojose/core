import { defineCollection } from 'astro:content';

// Colecciones preparadas para contenido futuro (blog, casos de uso, etc.).
// Añadir schemas Zod aquí cuando se creen las primeras colecciones.
export const collections = {} satisfies Record<string, ReturnType<typeof defineCollection>>;
