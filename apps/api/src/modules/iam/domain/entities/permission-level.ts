// Permission level es un enum jerárquico: cada nivel implica los anteriores.
// `NONE` es un bloqueo explícito que gana sobre cualquier herencia.
export const PERMISSION_LEVELS = [
  'NONE',
  'READ',
  'WRITE',
  'DELETE',
  'ADMIN',
] as const;

export type PermissionLevel = (typeof PERMISSION_LEVELS)[number];

const ORDER: Record<PermissionLevel, number> = {
  NONE: 0,
  READ: 1,
  WRITE: 2,
  DELETE: 3,
  ADMIN: 4,
};

export const PermissionLevels = {
  // ¿El nivel actual concedido satisface el nivel mínimo requerido?
  // `NONE` nunca satisface nada (es bloqueo explícito).
  satisfies(actual: PermissionLevel, required: PermissionLevel): boolean {
    if (actual === 'NONE') return false;
    if (required === 'NONE') return true; // bloqueo "como mucho NONE" — siempre satisfecho
    return ORDER[actual] >= ORDER[required];
  },
  max(a: PermissionLevel | null, b: PermissionLevel): PermissionLevel {
    if (a === null) return b;
    return ORDER[a] >= ORDER[b] ? a : b;
  },
};
