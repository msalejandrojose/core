// Categoría jerárquica del blog. Un post tiene 0..1 categoría.
// Entidad de dominio pura (sin Prisma/Nest).
export interface PostCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
