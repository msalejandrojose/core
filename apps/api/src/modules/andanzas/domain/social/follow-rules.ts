// Seguir a alguien (Follow) es direccional y no requiere aceptación (tipo
// Instagram con cuenta pública). La única regla de dominio es que nadie se
// sigue a sí mismo.
export function canFollow(followerId: string, targetId: string): boolean {
  return followerId !== targetId;
}

// Visibilidad de perfil en el MVP: cualquier usuario registrado (la app ya
// está cerrada por invitación, ver TASK-168) puede ver el perfil, la lista
// de sitios y el ranking de cualquier otro usuario, siga o no lo siga —
// igual que una cuenta pública de Instagram. `Follow` decide qué aparece en
// tu feed/mapa agregado, no controla el acceso al perfil. No hay concepto
// de cuenta privada / solicitud de seguimiento en el MVP.
export function canViewProfile(): boolean {
  return true;
}
