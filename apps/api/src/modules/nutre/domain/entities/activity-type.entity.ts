// Tipo de actividad del catálogo. `ownerUserId === null` = catálogo global;
// con valor = actividad privada de ese usuario.
//
// `met` (Metabolic Equivalent of Task) es lo que permite estimar el gasto sin
// pulsómetro, que es el caso normal en la v1 (registro manual).
export interface ActivityType {
  id: string;
  code: string | null;
  name: string;
  met: number;
  icon: string | null;
  ownerUserId: string | null;
}
