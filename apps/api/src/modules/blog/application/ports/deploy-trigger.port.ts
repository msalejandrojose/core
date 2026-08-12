export const DEPLOY_TRIGGER = Symbol('BLOG_DEPLOY_TRIGGER');

// Dispara un rebuild+deploy del sitio público (Astro, SSG) cuando cambia
// contenido visible del blog. La web no tiene SSR: sin este disparo, un post
// publicado/editado/retirado no aparecería hasta el siguiente deploy manual.
export interface DeployTriggerPort {
  trigger(reason: string): Promise<void>;
}
