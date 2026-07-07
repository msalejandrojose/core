// Comunidad autónoma. Pertenece a un país; `code` es el código INE de CCAA.
export interface Region {
  id: string;
  code: string;
  name: string;
  countryId: string;
  createdAt: Date;
  updatedAt: Date;
}
