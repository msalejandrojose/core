// Registro de una comparación binaria ("¿te gustó más A o B?") usada para
// insertar un SiteEntry nuevo en la lista ordenada del usuario. Sirve de
// auditoría y permite recalcular el ranking si cambia el algoritmo.
export interface Comparison {
  id: string;
  userId: string;
  winnerEntryId: string;
  loserEntryId: string;
  createdAt: Date;
}
