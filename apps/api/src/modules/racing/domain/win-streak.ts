// Cuenta victorias consecutivas desde la más reciente hacia atrás (TASK-321).
// `recentPositionsDesc` es la posición del jugador en sus últimas carreras
// online, de más reciente a más antigua — la más reciente es la que se
// acaba de registrar, así que si esa ya no es un 1º la racha es 0.
export function winStreakLength(recentPositionsDesc: number[]): number {
  let streak = 0;
  for (const position of recentPositionsDesc) {
    if (position !== 1) break;
    streak++;
  }
  return streak;
}
