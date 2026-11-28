import { deflateRawSync } from 'node:zlib';
import { readZipEntry } from './zip-entry';

/** Zip mínimo en memoria. `descriptor` deja a 0 los tamaños de la cabecera local. */
function zip(
  files: { name: string; data: string; deflate?: boolean }[],
  descriptor = false,
): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const raw = Buffer.from(f.data);
    const body = f.deflate ? deflateRawSync(raw) : raw;
    const name = Buffer.from(f.name);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(descriptor ? 0x08 : 0, 6);
    local.writeUInt16LE(f.deflate ? 8 : 0, 8);
    local.writeUInt32LE(descriptor ? 0 : body.length, 18);
    local.writeUInt32LE(descriptor ? 0 : raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(f.deflate ? 8 : 0, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cd.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, eocd]);
}

describe('readZipEntry', () => {
  const json = JSON.stringify({ signatureExpiresAt: '2026-12-03T19:17:10Z' });

  it('saca una entrada con deflate entre otras', () => {
    const z = zip([
      { name: 'Brio-1.0.0-1.apk', data: 'x'.repeat(500), deflate: true },
      { name: 'last-build.json', data: json, deflate: true },
    ]);
    expect(readZipEntry(z, 'last-build.json')?.toString()).toBe(json);
  });

  it('entradas guardadas sin comprimir', () => {
    const z = zip([{ name: 'last-build.json', data: json }]);
    expect(readZipEntry(z, 'last-build.json')?.toString()).toBe(json);
  });

  it('con data descriptor (tamaños a 0 en la cabecera local)', () => {
    const z = zip(
      [{ name: 'last-build.json', data: json, deflate: true }],
      true,
    );
    expect(readZipEntry(z, 'last-build.json')?.toString()).toBe(json);
  });

  it('null si no está o no es un zip', () => {
    expect(
      readZipEntry(zip([{ name: 'otro.txt', data: 'a' }]), 'last-build.json'),
    ).toBeNull();
    expect(readZipEntry(Buffer.from('no es un zip'), 'x')).toBeNull();
  });
});
