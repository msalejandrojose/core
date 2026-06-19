/**
 * Resultado de aplicación (NO es el DTO HTTP) con las métricas agregadas que
 * alimentan el dashboard del backoffice. Solo números agregados, nunca PII.
 */
export interface DashboardStats {
  users: { total: number; active: number };
  roles: { total: number };
  apiSections: { total: number };
  blog: {
    posts: number;
    published: number;
    categories: number;
    tags: number;
  };
  files: { total: number };
}
