import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  BuildPipelinePort,
  PipelineArtifact,
  PipelineRun,
  PipelineRunner,
} from '../../application/ports/build-pipeline.port';
import type { LaunchBuild } from '../../domain/mobile-build';
import { MobileBuildsGithubError } from '../../domain/mobile-builds.errors';
import { readZipEntry } from './zip-entry';

// Lanza y lee el workflow `.github/workflows/mobile-build.yml`, que corre en
// el runner self-hosted del Mac Mini (etiqueta `brio-mac`, apps/mobile/RUNNER.md).
//
// Token: fine-grained solo para el repo, con «Actions: read and write» (lanzar,
// ver y cancelar runs y bajar artefactos) y, si se quiere ver el estado del
// Mac, «Administration: read». Sin `GITHUB_BUILDS_TOKEN` la sección dice que
// no está configurada; no se rompe nada más.

const API = 'https://api.github.com';
const RUNNER_LABEL = 'brio-mac';

interface GithubRun {
  id: number;
  display_title: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  event: string;
  html_url: string;
  actor?: { login: string } | null;
  triggering_actor?: { login: string } | null;
  created_at: string;
  run_started_at?: string | null;
  updated_at: string;
}

@Injectable()
export class GithubActionsPipelineAdapter implements BuildPipelinePort {
  private readonly logger = new Logger('mobile-builds.github');
  private readonly token?: string;
  private readonly repo: string;
  private readonly workflow: string;

  constructor(config: ConfigService) {
    this.token = config.get<string>('GITHUB_BUILDS_TOKEN') || undefined;
    this.repo =
      config.get<string>('GITHUB_BUILDS_REPO') || 'msalejandrojose/core';
    this.workflow =
      config.get<string>('GITHUB_BUILDS_WORKFLOW') || 'mobile-build.yml';
    if (!this.token) {
      this.logger.warn(
        'GITHUB_BUILDS_TOKEN no definido: los builds nativos desde el backoffice están DESACTIVADOS.',
      );
    }
  }

  isConfigured(): boolean {
    return Boolean(this.token);
  }

  async dispatch(build: LaunchBuild): Promise<{ runId: number; url: string }> {
    const inputs: Record<string, string> = {
      platform: build.platform,
      profile: build.profile,
    };
    if (build.device) inputs.device = build.device;
    if (build.buildNumber) inputs.build_number = String(build.buildNumber);
    const res = await this.call(
      'POST',
      `/actions/workflows/${this.workflow}/dispatches`,
      {
        ref: build.ref,
        inputs,
        // Devuelve el id del run creado (si no, habría que buscarlo a ciegas).
        return_run_details: true,
      },
    );
    if (!res.ok) throw await this.fail('lanzar el build', res);
    const body = (await res.json()) as {
      workflow_run_id: number;
      html_url: string;
    };
    return { runId: body.workflow_run_id, url: body.html_url };
  }

  async listRuns(limit: number): Promise<PipelineRun[]> {
    const res = await this.call(
      'GET',
      `/actions/workflows/${this.workflow}/runs?per_page=${limit}`,
    );
    if (!res.ok) throw await this.fail('listar los builds', res);
    const body = (await res.json()) as { workflow_runs: GithubRun[] };
    return body.workflow_runs.map(toRun);
  }

  async getRun(id: number): Promise<PipelineRun | null> {
    const res = await this.call('GET', `/actions/runs/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw await this.fail('leer el build', res);
    const run = (await res.json()) as GithubRun & { path?: string };
    // Solo runs de este workflow: el endpoint sirve cualquiera del repo.
    if (run.path && !run.path.endsWith(`/${this.workflow}`)) return null;
    return toRun(run);
  }

  async cancel(id: number): Promise<void> {
    const res = await this.call('POST', `/actions/runs/${id}/cancel`);
    if (!res.ok && res.status !== 409)
      throw await this.fail('cancelar el build', res);
  }

  async artifacts(runId: number): Promise<PipelineArtifact[]> {
    const res = await this.call('GET', `/actions/runs/${runId}/artifacts`);
    if (!res.ok) throw await this.fail('listar los artefactos', res);
    const body = (await res.json()) as {
      artifacts: {
        id: number;
        name: string;
        size_in_bytes: number;
        expired: boolean;
        expires_at: string | null;
      }[];
    };
    return body.artifacts.map((a) => ({
      id: a.id,
      name: a.name,
      sizeBytes: a.size_in_bytes,
      expired: a.expired,
      expiresAt: a.expires_at ? new Date(a.expires_at) : null,
    }));
  }

  async artifactDownloadUrl(artifactId: number): Promise<string> {
    // GitHub contesta 302 a una URL firmada que vale un minuto.
    const res = await this.call(
      'GET',
      `/actions/artifacts/${artifactId}/zip`,
      undefined,
      'manual',
    );
    const location = res.headers.get('location');
    if (res.status !== 302 || !location)
      throw await this.fail('bajar el artefacto', res);
    return location;
  }

  async buildResult(runId: number): Promise<Record<string, unknown> | null> {
    const artifact = (await this.artifacts(runId)).find((a) => !a.expired);
    if (!artifact) return null;
    const url = await this.artifactDownloadUrl(artifact.id);
    // La URL ya va firmada: sin cabecera de autorización.
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw await this.fail('bajar el resultado del build', res);
    const json = readZipEntry(
      Buffer.from(await res.arrayBuffer()),
      'last-build.json',
    );
    if (!json) return null;
    try {
      return JSON.parse(json.toString('utf8')) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  async runner(): Promise<PipelineRunner | null> {
    const res = await this.call('GET', '/actions/runners?per_page=100');
    // Sin «Administration: read» el token no puede verlos: no es un error.
    if (res.status === 403 || res.status === 404) return null;
    if (!res.ok) throw await this.fail('ver el runner', res);
    const body = (await res.json()) as {
      runners: {
        name: string;
        status: string;
        busy: boolean;
        labels: { name: string }[];
      }[];
    };
    const r = body.runners.find((x) =>
      x.labels.some((l) => l.name === RUNNER_LABEL),
    );
    return r
      ? { name: r.name, online: r.status === 'online', busy: r.busy }
      : null;
  }

  private call(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    redirect: RequestRedirect = 'follow',
  ) {
    return fetch(`${API}/repos/${this.repo}${path}`, {
      method,
      redirect,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  }

  private async fail(
    what: string,
    res: Response,
  ): Promise<MobileBuildsGithubError> {
    const text = await res.text().catch(() => '');
    this.logger.error(
      `GitHub falló al ${what} (${res.status}): ${text.slice(0, 500)}`,
    );
    return new MobileBuildsGithubError(what, res.status);
  }
}

function toRun(r: GithubRun): PipelineRun {
  return {
    id: r.id,
    title: r.display_title,
    status: r.status,
    conclusion: r.conclusion,
    branch: r.head_branch,
    event: r.event,
    url: r.html_url,
    actor: r.triggering_actor?.login ?? r.actor?.login ?? null,
    createdAt: new Date(r.created_at),
    startedAt: r.run_started_at ? new Date(r.run_started_at) : null,
    updatedAt: new Date(r.updated_at),
  };
}
