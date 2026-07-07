// Municipio. Pertenece a una provincia; `code` es el código INE (5 dígitos).
export interface Municipality {
  id: string;
  code: string;
  name: string;
  provinceId: string;
  createdAt: Date;
  updatedAt: Date;
}
