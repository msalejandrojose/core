// Código postal. Pertenece a un municipio (ver nota N-M en el schema Prisma).
export interface PostalCode {
  id: string;
  code: string;
  municipalityId: string;
  createdAt: Date;
  updatedAt: Date;
}
