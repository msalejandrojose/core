// Provincia. Pertenece a un país y, opcionalmente, a una comunidad autónoma.
// `code` es el código INE de provincia (2 dígitos).
export interface Province {
  id: string;
  code: string;
  name: string;
  countryId: string;
  regionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
