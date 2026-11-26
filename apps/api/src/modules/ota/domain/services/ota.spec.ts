import {
  bundleStates,
  bundlesToPurge,
  cleanPublish,
  compareNative,
  pickBundle,
} from './ota';

const day = (n: number) => new Date(Date.UTC(2026, 10, n));
const b = (
  id: string,
  created: number,
  extra: Partial<{
    minNativeVersion: string;
    isEnabled: boolean;
    purgedAt: Date | null;
  }> = {},
) => ({
  id,
  createdAt: day(created),
  minNativeVersion: '1.0.0',
  isEnabled: true,
  purgedAt: null,
  ...extra,
});

describe('ota', () => {
  it('compara versiones nativas por números', () => {
    expect(compareNative('1.10', '1.9.3')).toBe(1);
    expect(compareNative('1.2', '1.2.0')).toBe(0);
    expect(compareNative('2.0.0', '10.0')).toBe(-1);
  });

  it('sirve la más reciente activa que encaja con la versión nativa', () => {
    const list = [
      b('v1', 1),
      b('v2', 2),
      b('v3', 3, { minNativeVersion: '1.2.0' }),
      b('v4', 4, { isEnabled: false }),
    ];
    expect(pickBundle(list, '1.2.0')?.id).toBe('v3');
    // Un teléfono con la app nativa vieja no recibe la que pide una más nueva.
    expect(pickBundle(list, '1.1.0')?.id).toBe('v2');
    expect(pickBundle(list, '0.9')).toBeNull();
    expect(pickBundle(list, null)?.id).toBe('v3');
  });

  it('borra lo que sobra, pero nunca lo que todavía se sirve', () => {
    const list = [
      b('v1', 1),
      b('v2', 2),
      b('v3', 3),
      b('v4', 4, { minNativeVersion: '2.0.0' }),
      b('v5', 5, { minNativeVersion: '2.0.0' }),
      b('old', 0, { purgedAt: day(3) }),
    ];
    // Con keep = 2 se quedan v5 y v4, y v3 porque es la última para la nativa 1.x.
    expect(bundlesToPurge(list, 2).map((x) => x.id)).toEqual(['v2', 'v1']);
    expect(bundlesToPurge(list, 10)).toEqual([]);
  });

  it('estado de cada subida para el backoffice', () => {
    const states = bundleStates([
      b('v1', 1),
      b('v2', 2, { isEnabled: false }),
      b('v0', 0, { purgedAt: day(2), isEnabled: false }),
    ]);
    expect(Object.fromEntries(states)).toEqual({
      v1: 'SERVING',
      v2: 'DISABLED',
      v0: 'PURGED',
    });
  });

  it('valida lo que sube el script', () => {
    const ok = {
      appId: 'es.aj.brio',
      version: '1.0.0-202611261030',
      minNativeVersion: '1.0.0',
      checksum: 'ab'.repeat(256),
      sessionKey: `${Buffer.alloc(16).toString('base64')}:${Buffer.alloc(256, 1).toString('base64')}`,
      sizeBytes: 1000,
      notes: '  Arreglos  ',
    };
    expect(cleanPublish(ok)).toMatchObject({
      channel: 'production',
      notes: 'Arreglos',
    });
    expect(cleanPublish({ ...ok, checksum: 'abc' })).toMatch(/checksum/);
    expect(cleanPublish({ ...ok, sessionKey: 'nope' })).toMatch(/sesión/);
    expect(cleanPublish({ ...ok, appId: 'brio' })).toMatch(/app/);
    expect(cleanPublish({ ...ok, minNativeVersion: 'v1' })).toMatch(/nativa/);
    expect(cleanPublish({ ...ok, sizeBytes: 0 })).toMatch(/vacío/);
  });
});
