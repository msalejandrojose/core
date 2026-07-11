import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeployTriggerPort } from '../../application/ports/deploy-trigger.port';

// Dispara un `repository_dispatch` sobre el repo de GitHub, que
// `.github/workflows/blog-deploy.yml` escucha para rebuildar y desplegar
// `apps/web` (Astro SSG) en Cloudflare Pages.
//
// Sin `GITHUB_DISPATCH_TOKEN`/`GITHUB_DISPATCH_REPO` configurados el disparo
// queda DESACTIVADO (dev/CI) — mismo patrón que el resto de webhooks
// opcionales del módulo notifications/whatsapp: no romper el flujo principal
// por infra que no está configurada en local.
@Injectable()
export class GithubDeployTriggerAdapter implements DeployTriggerPort {
  private readonly logger = new Logger('blog.deploy-trigger');
  private readonly token?: string;
  private readonly repo?: string;
  private readonly eventType: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('GITHUB_DISPATCH_TOKEN') || undefined;
    this.repo = config.get<string>('GITHUB_DISPATCH_REPO') || undefined;
    this.eventType =
      config.get<string>('GITHUB_DISPATCH_EVENT_TYPE') ||
      'blog_content_changed';

    if (!this.token || !this.repo) {
      this.logger.warn(
        'GITHUB_DISPATCH_TOKEN/GITHUB_DISPATCH_REPO no definidos — el rebuild de la web en publicar/editar posts está DESACTIVADO.',
      );
    }
  }

  // Nunca lanza: un fallo de GitHub no debe tumbar la publicación del post.
  // El editor puede forzar un deploy manual (workflow_dispatch) si esto falla.
  async trigger(reason: string): Promise<void> {
    if (!this.token || !this.repo) return;

    try {
      const res = await fetch(
        `https://api.github.com/repos/${this.repo}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: this.eventType,
            client_payload: { reason },
          }),
        },
      );
      if (!res.ok) {
        this.logger.error(
          `repository_dispatch falló (${res.status}): ${await res.text().catch(() => '')}`,
        );
      }
    } catch (err) {
      this.logger.error('repository_dispatch falló', err as Error);
    }
  }
}
