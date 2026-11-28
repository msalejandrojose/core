import { ConfigService } from '@nestjs/config';
import type { LaunchBuild } from '../../domain/mobile-build';
import {
  InvalidMobileBuildError,
  MobileBuildNotFoundError,
  MobileBuildsNotConfiguredError,
} from '../../domain/mobile-builds.errors';
import type {
  BuildPipelinePort,
  PipelineArtifact,
  PipelineRun,
  PipelineRunner,
} from '../ports/build-pipeline.port';
import { MobileBuildsUseCases } from './mobile-builds.use-cases';

class FakePipeline implements BuildPipelinePort {
  configured = true;
  runs: PipelineRun[] = [];
  dispatched: LaunchBuild[] = [];
  cancelled: number[] = [];
  arts: Record<number, PipelineArtifact[]> = {};
  mac: PipelineRunner | null = { name: 'mac-mini', online: true, busy: false };
  results: Record<number, Record<string, unknown> | null> = {};
  resultCalls: number[] = [];

  isConfigured() {
    return this.configured;
  }
  dispatch(build: LaunchBuild) {
    this.dispatched.push(build);
    const id = 100 + this.dispatched.length;
    const device = build.device ? ` · ${build.device}` : '';
    this.runs.unshift(
      run(
        id,
        `${build.platform} · ${build.profile}${device}`,
        'queued',
        null,
        build.ref,
      ),
    );
    return Promise.resolve({
      runId: id,
      url: `https://github.com/x/runs/${id}`,
    });
  }
  listRuns(limit: number) {
    return Promise.resolve(this.runs.slice(0, limit));
  }
  getRun(id: number) {
    return Promise.resolve(this.runs.find((r) => r.id === id) ?? null);
  }
  cancel(id: number) {
    this.cancelled.push(id);
    return Promise.resolve();
  }
  artifacts(runId: number) {
    return Promise.resolve(this.arts[runId] ?? []);
  }
  artifactDownloadUrl(artifactId: number) {
    return Promise.resolve(`https://signed.example/${artifactId}`);
  }
  buildResult(runId: number) {
    this.resultCalls.push(runId);
    return Promise.resolve(this.results[runId] ?? null);
  }
  runner() {
    return Promise.resolve(this.mac);
  }
}

function run(
  id: number,
  title: string,
  status: string,
  conclusion: string | null,
  branch = 'brio-dev',
): PipelineRun {
  return {
    id,
    title,
    status,
    conclusion,
    branch,
    event: 'workflow_dispatch',
    url: `https://github.com/x/runs/${id}`,
    actor: 'msalejandrojose',
    createdAt: new Date('2026-11-28T09:00:00Z'),
    startedAt: status === 'queued' ? null : new Date('2026-11-28T09:00:10Z'),
    updatedAt: new Date('2026-11-28T09:03:40Z'),
  };
}

function setup(env: Record<string, string> = {}) {
  const pipeline = new FakePipeline();
  const uc = new MobileBuildsUseCases(pipeline, new ConfigService(env));
  return { pipeline, uc };
}

describe('MobileBuildsUseCases', () => {
  it('lista los builds con estado, título y duración', async () => {
    const { pipeline, uc } = setup();
    pipeline.runs = [
      run(2, 'ios · device · iPhone de Alejandro Jose', 'completed', 'success'),
      run(1, 'android · device', 'in_progress', null),
    ];
    const list = await uc.list();
    expect(list.configured).toBe(true);
    expect(list.defaultRef).toBe('brio-dev');
    expect(list.runner).toEqual({
      name: 'mac-mini',
      online: true,
      busy: false,
    });
    expect(list.builds[0]).toMatchObject({
      id: 2,
      state: 'SUCCESS',
      platform: 'ios',
      profile: 'device',
      device: 'iPhone de Alejandro Jose',
      durationSeconds: 210,
    });
    expect(list.builds[1]).toMatchObject({
      state: 'RUNNING',
      finishedAt: null,
      durationSeconds: null,
    });
  });

  it('sin token: la lista dice que no está configurado y lanzar falla', async () => {
    const { pipeline, uc } = setup();
    pipeline.configured = false;
    await expect(uc.list()).resolves.toEqual({
      configured: false,
      defaultRef: 'brio-dev',
      runner: null,
      signature: null,
      builds: [],
    });
    await expect(
      uc.launch({ platform: 'ios', profile: 'device' }),
    ).rejects.toThrow(MobileBuildsNotConfiguredError);
  });

  it('lanza con la rama por defecto de la config y devuelve el run creado', async () => {
    const { pipeline, uc } = setup({ GITHUB_BUILDS_REF: 'brio-main' });
    const b = await uc.launch({
      platform: 'ios',
      profile: 'device',
      device: 'iPhone de Alejandro Jose',
    });
    expect(pipeline.dispatched).toEqual([
      {
        platform: 'ios',
        profile: 'device',
        device: 'iPhone de Alejandro Jose',
        buildNumber: null,
        ref: 'brio-main',
      },
    ]);
    expect(b).toMatchObject({
      id: 101,
      state: 'QUEUED',
      ref: 'brio-main',
      artifacts: [],
    });
  });

  it('al lanzar no depende del título del run (GitHub tarda en ponerlo)', async () => {
    const { pipeline, uc } = setup();
    const dispatch = pipeline.dispatch.bind(pipeline);
    pipeline.dispatch = async (build) => {
      const r = await dispatch(build);
      pipeline.runs[0].title = 'Mobile build';
      return r;
    };
    const b = await uc.launch({
      platform: 'android',
      profile: 'testflight',
      ref: 'brio-dev--x',
    });
    expect(b).toMatchObject({
      platform: 'android',
      profile: 'testflight',
      device: null,
      ref: 'brio-dev--x',
    });
  });

  it('no lanza nada si la petición no vale', async () => {
    const { pipeline, uc } = setup();
    await expect(
      uc.launch({ platform: 'ios', profile: 'beta' }),
    ).rejects.toThrow(InvalidMobileBuildError);
    expect(pipeline.dispatched).toHaveLength(0);
  });

  it('cancela solo lo que no ha terminado', async () => {
    const { pipeline, uc } = setup();
    pipeline.runs = [
      run(1, 'ios · device', 'in_progress', null),
      run(2, 'ios · device', 'completed', 'failure'),
    ];
    await uc.cancel(1);
    expect(pipeline.cancelled).toEqual([1]);
    await expect(uc.cancel(2)).rejects.toThrow(InvalidMobileBuildError);
    await expect(uc.cancel(3)).rejects.toThrow(MobileBuildNotFoundError);
  });

  it('detalle con artefactos y URL de descarga solo de los suyos y vigentes', async () => {
    const { pipeline, uc } = setup();
    pipeline.runs = [run(1, 'android · device', 'completed', 'success')];
    pipeline.arts[1] = [
      {
        id: 7,
        name: 'brio-android-device-3',
        sizeBytes: 1234,
        expired: false,
        expiresAt: null,
      },
      { id: 8, name: 'viejo', sizeBytes: 10, expired: true, expiresAt: null },
    ];
    expect((await uc.get(1)).artifacts).toHaveLength(2);
    await expect(uc.artifactUrl(1, 7)).resolves.toBe(
      'https://signed.example/7',
    );
    await expect(uc.artifactUrl(1, 8)).rejects.toThrow(/caducado/);
    await expect(uc.artifactUrl(1, 99)).rejects.toThrow(
      MobileBuildNotFoundError,
    );
    await expect(uc.get(5)).rejects.toThrow(MobileBuildNotFoundError);
  });

  describe('firma', () => {
    it('la del último build iOS que se instaló, y no la vuelve a bajar', async () => {
      const { pipeline, uc } = setup();
      pipeline.runs = [
        run(5, 'android · device', 'completed', 'success'),
        run(4, 'ios · testflight', 'completed', 'success'),
        run(3, 'ios · device · iPhone', 'completed', 'failure'),
        run(2, 'ios · device · iPhone', 'completed', 'success'),
        run(1, 'ios · device · iPhone', 'completed', 'success'),
      ];
      pipeline.results[2] = { signatureExpiresAt: '2026-12-03T19:17:10Z' };
      pipeline.results[1] = { signatureExpiresAt: '2026-11-30T10:00:00Z' };
      const first = await uc.list();
      expect(first.signature).toEqual({
        expiresAt: new Date('2026-12-03T19:17:10Z'),
        buildId: 2,
      });
      await uc.list();
      expect(pipeline.resultCalls).toEqual([2]);
    });

    it('null si el último build no la apuntó o no hay ninguno', async () => {
      const { pipeline, uc } = setup();
      expect((await uc.list()).signature).toBeNull();
      pipeline.runs = [run(1, 'ios · device', 'completed', 'success')];
      pipeline.results[1] = { build: 476768 };
      expect((await uc.list()).signature).toBeNull();
    });

    it('si GitHub falla al leerla, la lista sale igual', async () => {
      const { pipeline, uc } = setup();
      pipeline.runs = [run(1, 'ios · device', 'completed', 'success')];
      pipeline.buildResult = () => Promise.reject(new Error('502'));
      const list = await uc.list();
      expect(list.signature).toBeNull();
      expect(list.builds).toHaveLength(1);
    });
  });
});
