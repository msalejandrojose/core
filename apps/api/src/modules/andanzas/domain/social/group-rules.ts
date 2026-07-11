// Un Group es una carpeta del propio usuario sobre un subconjunto de la
// gente que sigue (ver TASK-167) — no es una relación de amistad nueva, así
// que solo se puede meter en un grupo a alguien a quien ya se sigue.
export function canAddToGroup(
  followedUserIds: readonly string[],
  candidateUserId: string,
): boolean {
  return followedUserIds.includes(candidateUserId);
}
