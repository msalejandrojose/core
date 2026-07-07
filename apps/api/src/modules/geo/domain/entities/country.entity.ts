// País. Entidad de dominio pura (sin Prisma/Nest). Clave natural: códigos ISO.
export interface Country {
  id: string;
  iso2: string;
  iso3: string;
  numericCode: string | null;
  name: string;
  nativeName: string | null;
  phoneCode: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
