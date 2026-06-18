// Etiqueta transversal del blog. Entidad de dominio pura (sin Prisma/Nest).
export interface PostTag {
  id: string;
  slug: string;
  name: string;
  createdAt: Date;
}
