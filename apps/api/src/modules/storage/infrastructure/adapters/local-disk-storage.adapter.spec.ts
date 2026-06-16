import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LocalDiskStorageAdapter } from './local-disk-storage.adapter';

describe('LocalDiskStorageAdapter', () => {
  let root: string;
  let adapter: LocalDiskStorageAdapter;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'storage-test-'));
    const config = new ConfigService({
      STORAGE_LOCAL_PATH: root,
      JWT_SECRET: 'test-secret',
    });
    adapter = new LocalDiskStorageAdapter(config, new JwtService());
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes, reads, stats and deletes an object on disk', async () => {
    await adapter.put({
      key: 'a/b.txt',
      body: Buffer.from('hello'),
      contentType: 'text/plain',
    });

    expect(await adapter.exists('a/b.txt')).toBe(true);
    expect(await adapter.get('a/b.txt')).toEqual(Buffer.from('hello'));
    expect(await adapter.stat('a/b.txt')).toEqual({ sizeBytes: 5 });

    await adapter.delete('a/b.txt');
    expect(await adapter.exists('a/b.txt')).toBe(false);
  });

  it('returns null from stat() for a missing key', async () => {
    expect(await adapter.stat('missing.txt')).toBeNull();
  });

  it('signs and verifies a raw token for the same key', async () => {
    const url = await adapter.getSignedUrl('a/b.txt', 60);
    const token = new URL(url, 'http://localhost').searchParams.get('token');
    expect(adapter.verifyRawToken(token!)).toBe('a/b.txt');
  });

  it('rejects path traversal in the key', async () => {
    await expect(adapter.get('../../etc/passwd')).rejects.toThrow();
  });
});
