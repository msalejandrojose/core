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

export interface BuildListView {
  configured: boolean;
  defaultRef: string;
  runner: PipelineRunner | null;
  builds: BuildView[];
}

const LIST_LIMIT = 20;

@Injectable()
export class MobileBuildsUseCases {
  private readonly defaultRef: string;

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
        builds: [],
      };
    }
    const [runs, runner] = await Promise.all([
      this.pipeline.listRuns(LIST_LIMIT),
      this.pipeline.runner(),
    ]);
    return {
      configured: true,
      defaultRef: this.defaultRef,
      runner,
      builds: runs.map(toView),
    };
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
    return { ...toView(run), artifacts: [] };
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
