import type { LaunchBuild } from '../../domain/mobile-build';

export const BUILD_PIPELINE = Symbol('BUILD_PIPELINE');

/** Un run del workflow de builds, tal como lo cuenta GitHub Actions. */
export interface PipelineRun {
  id: number;
  title: string;
  status: string;
  conclusion: string | null;
  branch: string;
  event: string;
  url: string;
  actor: string | null;
  createdAt: Date;
  startedAt: Date | null;
  updatedAt: Date;
}

export interface PipelineArtifact {
  id: number;
  name: string;
  sizeBytes: number;
  expired: boolean;
  expiresAt: Date | null;
}

export interface PipelineRunner {
  name: string;
  online: boolean;
  busy: boolean;
}

/** Dónde se compilan los builds (hoy: GitHub Actions con el runner del Mac). */
export interface BuildPipelinePort {
  /** Sin token no se puede hablar con GitHub. */
  isConfigured(): boolean;
  dispatch(build: LaunchBuild): Promise<{ runId: number; url: string }>;
  listRuns(limit: number): Promise<PipelineRun[]>;
  getRun(id: number): Promise<PipelineRun | null>;
  cancel(id: number): Promise<void>;
  artifacts(runId: number): Promise<PipelineArtifact[]>;
  /** URL firmada y de vida corta para bajar el zip de un artefacto. */
  artifactDownloadUrl(artifactId: number): Promise<string>;
  /** `last-build.json` del artefacto de un run (lo que deja el Fastfile); null si no hay. */
  buildResult(runId: number): Promise<Record<string, unknown> | null>;
  /** El runner del Mac; null si el token no puede verlo. */
  runner(): Promise<PipelineRunner | null>;
}
