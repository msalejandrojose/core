import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type BuildPlatform,
  type BuildProfile,
  type BuildState,
  buildState,
  cleanLaunch,
  parseRunTitle,
} from '../../domain/mobile-build';
import {
  InvalidMobileBuildError,
  MobileBuildNotFoundError,
  MobileBuildsNotConfiguredError,
} from '../../domain/mobile-builds.errors';
import {
  BUILD_PIPELINE,
  type BuildPipelinePort,
  type PipelineArtifact,
  type PipelineRun,
  type PipelineRunner,
} from '../ports/build-pipeline.port';

export interface BuildView {
  id: number;
  state: BuildState;
  platform: BuildPlatform | null;
  profile: BuildProfile | null;
  device: string | null;
  ref: string;
  url: string;
  launchedBy: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationSeconds: number | null;
}

export interface BuildDetailView extends BuildView {
  artifacts: PipelineArtifact[];
}

/** Hasta cuándo vale la firma de la app del iPhone (último build «Móvil» o «mac»). */
export interface SignatureView {
  expiresAt: Date;
  buildId: number;
}

export interface BuildListView {
  configured: boolean;
  defaultRef: string;
  runner: PipelineRunner | null;
  signature: SignatureView | null;
  builds: BuildView[];
}

const LIST_LIMIT = 20;

@Injectable()
export class MobileBuildsUseCases {
  private readonly defaultRef: string;
  /** `signatureExpiresAt` por run: un build terminado no cambia, así no se baja cada vez. */
  private readonly signatures = new Map<number, Date | null>();

  constructor(
    @Inject(BUILD_PIPELINE) private readonly pipeline: BuildPipelinePort,
    config: ConfigService,
  ) {
    this.defaultRef = config.get<string>('GITHUB_BUILDS_REF') || 'brio-dev';
  }

  async list(): Promise<BuildListView> {
    if (!this.pipeline.isConfigured()) {
      return {
        configured: false,
        defaultRef: this.defaultRef,
        runner: null,
        signature: null,
        builds: [],
      };
    }
    const [runs, runner] = await Promise.all([
      this.pipeline.listRuns(LIST_LIMIT),
      this.pipeline.runner(),
    ]);
    const builds = runs.map(toView);
    return {
      configured: true,
      defaultRef: this.defaultRef,
      runner,
      signature: await this.signature(builds),
      builds,
    };
  }

  /**
   * La firma de la app instalada es la del último build iOS que se instaló
   * (perfiles device/mac). La apunta el Fastfile en last-build.json. Los builds
   * de antes de que existiera el campo no la llevan.
   */
  private async signature(builds: BuildView[]): Promise<SignatureView | null> {
    const last = builds.find(
      (b) =>
        b.state === 'SUCCESS' &&
        b.platform === 'ios' &&
        (b.profile === 'device' || b.profile === 'mac'),
    );
    if (!last) return null;
    if (!this.signatures.has(last.id)) {
      try {
        const result = await this.pipeline.buildResult(last.id);
        const raw = result?.signatureExpiresAt;
        const at = typeof raw === 'string' ? new Date(raw) : null;
        this.signatures.set(
          last.id,
          at && !Number.isNaN(at.getTime()) ? at : null,
        );
      } catch {
        // Si GitHub falla aquí, la lista se enseña igual; se reintenta luego.
        return null;
      }
    }
    const expiresAt = this.signatures.get(last.id) ?? null;
    return expiresAt ? { expiresAt, buildId: last.id } : null;
  }

  async get(id: number): Promise<BuildDetailView> {
    this.assertConfigured();
    const run = await this.pipeline.getRun(id);
    if (!run) throw new MobileBuildNotFoundError(id);
    return { ...toView(run), artifacts: await this.pipeline.artifacts(id) };
  }

  async launch(input: {
    platform: string;
    profile: string;
    device?: string | null;
    buildNumber?: number | null;
    ref?: string | null;
  }): Promise<BuildDetailView> {
    this.assertConfigured();
    const build = cleanLaunch({ ...input, defaultRef: this.defaultRef });
    const { runId } = await this.pipeline.dispatch(build);
    const run = await this.pipeline.getRun(runId);
    if (!run) throw new MobileBuildNotFoundError(runId);
    // Recién creado, GitHub aún no ha puesto el `run-name` (el título sale
    // vacío): lo que se ha lanzado se sabe, no hace falta leerlo del título.
    return {
      ...toView(run),
      platform: build.platform,
      profile: build.profile,
      device: build.device,
      ref: build.ref,
      artifacts: [],
    };
  }

  async cancel(id: number): Promise<BuildView> {
    this.assertConfigured();
    const run = await this.pipeline.getRun(id);
    if (!run) throw new MobileBuildNotFoundError(id);
    if (run.status === 'completed') {
      throw new InvalidMobileBuildError('ese build ya ha terminado');
    }
    await this.pipeline.cancel(id);
    return toView(run);
  }

  async artifactUrl(buildId: number, artifactId: number): Promise<string> {
    this.assertConfigured();
    const artifact = (await this.pipeline.artifacts(buildId)).find(
      (a) => a.id === artifactId,
    );
    if (!artifact) throw new MobileBuildNotFoundError(buildId);
    if (artifact.expired)
      throw new InvalidMobileBuildError('el artefacto ya ha caducado');
    return this.pipeline.artifactDownloadUrl(artifactId);
  }

  private assertConfigured() {
    if (!this.pipeline.isConfigured())
      throw new MobileBuildsNotConfiguredError();
  }
}

function toView(run: PipelineRun): BuildView {
  const state = buildState(run.status, run.conclusion);
  const finished = run.status === 'completed';
  const finishedAt = finished ? run.updatedAt : null;
  return {
    id: run.id,
    state,
    ...parseRunTitle(run.title),
    ref: run.branch,
    url: run.url,
    launchedBy: run.actor,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    finishedAt,
    durationSeconds:
      finishedAt && run.startedAt
        ? Math.max(
            0,
            Math.round((finishedAt.getTime() - run.startedAt.getTime()) / 1000),
          )
        : null,
  };
}
