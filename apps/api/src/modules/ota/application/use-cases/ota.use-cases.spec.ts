import { ConfigService } from '@nestjs/config';
import type { StoragePort } from '../../../storage/application/ports/storage.port';
import type { OtaBundle } from '../../domain/entities/ota-bundle.entity';
import type { OtaBundleRepositoryPort } from '../ports/ota-bundle-repository.port';
import { OtaUseCases } from './ota.use-cases';

class FakeRepo implements OtaBundleRepositoryPort {
  rows: OtaBundle[] = [];
  private t = 0;
  list(appId: string, channel: string) {
    return Promise.resolve(
      this.rows
        .filter((r) => r.appId === appId && r.channel === channel)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    );
  }
  apps() {
    const seen = new Map<string, { appId: string; channel: string }>();
    for (const r of this.rows)
      seen.set(`${r.appId}|${r.channel}`, {
        appId: r.appId,
        channel: r.channel,
      });
    return Promise.resolve([...seen.values()]);
  }
  find(id: string) {
    return Promise.resolve(this.rows.find((r) => r.id === id) ?? null);
  }
  exists(appId: string, channel: string, version: string) {
    return Promise.resolve(
      this.rows.some(
        (r) =>
          r.appId === appId && r.channel === channel && r.version === version,
      ),
    );
  }
  create(data: Parameters<OtaBundleRepositoryPort['create']>[0]) {
    this.t += 1;
    const row: OtaBundle = {
      ...data,
      id: `id-${this.t}`,
      isEnabled: true,
      purgedAt: null,
      createdAt: new Date(Date.UTC(2026, 10, 1, 0, this.t)),
    };
    this.rows.push(row);
    return Promise.resolve(row);
  }
  setEnabled(id: string, isEnabled: boolean) {
    const r = this.rows.find((x) => x.id === id);
    if (r) r.isEnabled = isEnabled;
    return Promise.resolve(r ?? null);
  }
  markPurged(id: string, at: Date) {
    const r = this.rows.find((x) => x.id === id)!;
    r.purgedAt = at;
    r.isEnabled = false;
    return Promise.resolve();
  }
}

describe('OtaUseCases', () => {
  const objects = new Map<string, Buffer>();
  const storage = {
    put: jest.fn(({ key, body }: { key: string; body: Buffer }) => {
      objects.set(key, body);
      return Promise.resolve();
    }),
    delete: jest.fn((key: string) => {
      objects.delete(key);
      return Promise.resolve();
    }),
    getSignedUrl: jest.fn((key: string) =>
      Promise.resolve(`https://r2.example/${key}?sig=1`),
    ),
  } as unknown as StoragePort;
  const config = new ConfigService({ OTA_KEEP_BUNDLES: '2' });
  let repo: FakeRepo;
  let ota: OtaUseCases;

  const input = (version: string, minNativeVersion = '1.0.0') => ({
    appId: 'es.aj.brio',
    version,
    minNativeVersion,
    checksum: 'cd'.repeat(256),
    sessionKey: `${Buffer.alloc(16, 2).toString('base64')}:${Buffer.alloc(256, 3).toString('base64')}`,
  });

  beforeEach(() => {
    objects.clear();
    repo = new FakeRepo();
    ota = new OtaUseCases(repo, storage, config);
  });

  it('publica, sirve la nueva y avisa si ya la tienes', async () => {
    await ota.publish(input('1.0.0-1'), Buffer.from('zip1'), 'u1');
    const answer = await ota.check({
      appId: 'es.aj.brio',
      versionName: 'builtin',
      versionBuild: '1.0.0',
      channel: null,
    });
    expect(answer).toMatchObject({
      version: '1.0.0-1',
      checksum: 'cd'.repeat(256),
    });
    expect('url' in answer && answer.url).toMatch(
      /^https:\/\/r2\.example\/ota\/es\.aj\.brio\/production\//,
    );
    expect(
      await ota.check({
        appId: 'es.aj.brio',
        versionName: '1.0.0-1',
        versionBuild: '1.0.0',
        channel: null,
      }),
    ).toMatchObject({ kind: 'up_to_date' });
  });

  it('al publicar borra del storage lo que sobra (se quedan 2)', async () => {
    for (const v of ['a', 'b', 'c', 'd'])
      await ota.publish(input(`1.0.0-${v}`), Buffer.from(v), null);
    expect(objects.size).toBe(2);
    const { bundles } = await ota.list('es.aj.brio', null);
    expect(bundles.map((x) => [x.version, x.state])).toEqual([
      ['1.0.0-d', 'SERVING'],
      ['1.0.0-c', 'AVAILABLE'],
      ['1.0.0-b', 'PURGED'],
      ['1.0.0-a', 'PURGED'],
    ]);
  });

  it('desactivar la última hace que vuelvan a la anterior', async () => {
    await ota.publish(input('1.0.0-a'), Buffer.from('a'), null);
    const last = await ota.publish(input('1.0.0-b'), Buffer.from('b'), null);
    await ota.setEnabled(last.id, false);
    const answer = await ota.check({
      appId: 'es.aj.brio',
      versionName: '1.0.0-b',
      versionBuild: '1.0.0',
      channel: null,
    });
    expect(answer).toMatchObject({ version: '1.0.0-a' });
  });

  it('desactivar todas hace que vuelvan a la web de la app', async () => {
    const only = await ota.publish(input('1.0.0-a'), Buffer.from('a'), null);
    await ota.setEnabled(only.id, false);
    const ask = (versionName: string) =>
      ota.check({
        appId: 'es.aj.brio',
        versionName,
        versionBuild: '1.0',
        channel: null,
      });
    expect(await ask('1.0.0-a')).toEqual({ version: 'builtin' });
    expect(await ask('builtin')).toMatchObject({ kind: 'up_to_date' });
  });

  it('no deja repetir versión ni subir sin firmar', async () => {
    await ota.publish(input('1.0.0-a'), Buffer.from('a'), null);
    await expect(
      ota.publish(input('1.0.0-a'), Buffer.from('a'), null),
    ).rejects.toMatchObject({ code: 'OTA_BUNDLE_DUPLICATED' });
    await expect(
      ota.publish(
        { ...input('1.0.0-b'), checksum: 'x' },
        Buffer.from('b'),
        null,
      ),
    ).rejects.toMatchObject({ code: 'OTA_BUNDLE_INVALID' });
  });
});
