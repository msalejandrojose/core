#!/usr/bin/env node
/**
 * Actualizaciones en caliente (OTA) de la app: ver `ota/README.md`.
 *
 *   pnpm ota:keygen               crea el par de claves (una sola vez)
 *   pnpm ota:publish [opciones]   construye la web, la cifra y la sube
 *
 * Opciones de publish:
 *   --notes "texto"      qué lleva (sale en el backoffice)
 *   --min-native 1.2.0   versión nativa mínima (por defecto, la de ota/config.json)
 *   --channel nombre     canal (por defecto, el de ota/config.json)
 *   --version x          nombre de la versión (por defecto, <nativa>-<fecha>)
 *   --skip-build         usa el dist/ que ya hay
 *   --dry-run            lo prepara todo en ota/out/ sin subir nada
 *   --api https://…      API a la que subir (por defecto VITE_API_URL)
 *
 * El zip se cifra con AES-128-CBC y una clave de sesión aleatoria; esa clave y
 * el SHA-256 del zip se firman con la clave privada (RSA, PKCS#1 v1.5). Es el
 * formato del plugin @capgo/capacitor-updater: la app lo descifra con la clave
 * pública y no instala nada que no venga firmado con tu clave privada.
 */
import { spawnSync } from 'node:child_process';
import {
  constants,
  createCipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  privateEncrypt,
  publicDecrypt,
  randomBytes,
  createDecipheriv,
} from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';
import { loadEnv } from 'vite';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OTA_DIR = join(ROOT, 'ota');
const PUBLIC_KEY = join(OTA_DIR, 'public.pem');
const CONFIG = JSON.parse(readFileSync(join(OTA_DIR, 'config.json'), 'utf8'));

const fail = (msg) => {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
};

function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else if (['--skip-build', '--dry-run', '--force'].includes(a)) out[a.slice(2)] = true;
    else out[a.slice(2)] = argv[(i += 1)];
  }
  return out;
}

// ------------------------------------------------------------------ claves

function keygen(opts) {
  const env = loadEnv('production', ROOT, ['OTA_']);
  const privatePath = env.OTA_PRIVATE_KEY_PATH || join(OTA_DIR, 'private.pem');
  if ((existsSync(PUBLIC_KEY) || existsSync(privatePath)) && !opts.force) {
    fail(
      'Ya hay claves. Cambiarlas deja sin actualizaciones a las apps instaladas hasta que se publique ' +
        'una versión nativa nueva con la pública nueva. Si de verdad quieres, usa --force.',
    );
  }
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    // El plugin espera la pública en PKCS#1 («BEGIN RSA PUBLIC KEY»).
    publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  mkdirSync(dirname(privatePath), { recursive: true });
  writeFileSync(privatePath, privateKey, { mode: 0o600 });
  chmodSync(privatePath, 0o600);
  writeFileSync(PUBLIC_KEY, publicKey);
  console.log(`✓ Clave pública:  ${relative(process.cwd(), PUBLIC_KEY)}  (se sube al repo; va dentro de la app)`);
  console.log(`✓ Clave privada:  ${privatePath}  (NO se sube; guárdala en tu gestor de contraseñas)`);
  console.log('\nSiguiente paso: build nativo nuevo (pnpm ios:prod) para que la app lleve el plugin y la clave pública.');
}

// --------------------------------------------------------------------- zip

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

/** Zip estándar (deflate) de una carpeta, con index.html en la raíz. Sin dependencias. */
export function zipDir(dir) {
  const parts = [];
  const central = [];
  let offset = 0;
  // Fecha fija: el mismo dist da el mismo zip.
  const time = 0;
  const date = (2024 - 1980) << 9 | (1 << 5) | 1;
  for (const full of walk(dir)) {
    const name = Buffer.from(relative(dir, full).split(sep).join('/'), 'utf8');
    const data = readFileSync(full);
    const deflated = deflateRawSync(data, { level: 9 });
    const stored = deflated.length >= data.length;
    const body = stored ? data : deflated;
    const crc = crc32(data);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4);
    head.writeUInt16LE(0x0800, 6); // nombres en UTF-8
    head.writeUInt16LE(stored ? 0 : 8, 8);
    head.writeUInt16LE(time, 10);
    head.writeUInt16LE(date, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(data.length, 22);
    head.writeUInt16LE(name.length, 26);
    head.writeUInt16LE(0, 28);
    parts.push(head, name, body);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(stored ? 0 : 8, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(body.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += head.length + name.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const count = central.length / 2;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(count, 8);
  end.writeUInt16LE(count, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, cdBuf, end]);
}

// ------------------------------------------------------------------ cifrado

/** Cifra el zip como lo espera el plugin y comprueba que la pública lo abre. */
export function encryptBundle(zip, privatePem, publicPem) {
  const privateKey = createPrivateKey(privatePem);
  const sessionKey = randomBytes(16);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-128-cbc', sessionKey, iv);
  const encrypted = Buffer.concat([cipher.update(zip), cipher.final()]);
  const sign = (buf) => privateEncrypt({ key: privateKey, padding: constants.RSA_PKCS1_PADDING }, buf);
  const sha = createHash('sha256').update(zip).digest();
  const result = {
    encrypted,
    sessionKey: `${iv.toString('base64')}:${sign(sessionKey).toString('base64')}`,
    checksum: sign(sha).toString('hex'),
  };
  // Lo mismo que hará el teléfono: si esto falla, la app lo rechazaría.
  const publicKey = createPublicKey(publicPem);
  const open = (b64) => publicDecrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(b64, 'base64'));
  const [ivB64, keyB64] = result.sessionKey.split(':');
  const decipher = createDecipheriv('aes-128-cbc', open(keyB64), Buffer.from(ivB64, 'base64'));
  const back = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  const checksumBack = publicDecrypt({ key: publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(result.checksum, 'hex'));
  if (!back.equals(zip) || !checksumBack.equals(sha)) {
    fail('La clave privada no casa con ota/public.pem: la app no podría abrir esta actualización.');
  }
  return result;
}

// ---------------------------------------------------------------- publicar

function ask(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
      };
    }
    rl.question(question, (a) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(a.trim());
    });
  });
}

const stamp = () => new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);

async function publish(opts) {
  const env = loadEnv('production', ROOT, ['VITE_', 'OTA_']);
  const api = (opts.api || env.VITE_API_URL || '').trim().replace(/\/+$/, '');
  // Por http solo contra una API local (para probar).
  if (!api.startsWith('https://') && !/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(api))
    fail('VITE_API_URL (en .env.production.local) tiene que ser la API de producción por https.');
  if (!existsSync(PUBLIC_KEY)) fail('Falta ota/public.pem. Créala con «pnpm ota:keygen».');
  const privatePath = env.OTA_PRIVATE_KEY_PATH || join(OTA_DIR, 'private.pem');
  if (!existsSync(privatePath)) fail(`Falta la clave privada (${privatePath}).`);

  const appId = CONFIG.appId;
  const channel = opts.channel || CONFIG.channel || 'production';
  const minNative = opts['min-native'] || CONFIG.minNativeVersion;
  if (!/^\d+(\.\d+){0,3}$/.test(minNative)) fail(`Versión nativa mínima no válida: ${minNative}`);
  const version = opts.version || `${minNative}-${stamp()}`;

  if (!opts['skip-build']) {
    console.log('› Construyendo la web…');
    const r = spawnSync('pnpm', ['exec', 'sh', '-c', 'tsc --noEmit && vite build'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, CAP_SERVER_URL: '' },
    });
    if (r.status !== 0) fail('Falló el build.');
  }
  const dist = join(ROOT, 'dist');
  if (!existsSync(join(dist, 'index.html'))) fail('No hay dist/index.html: construye primero.');

  console.log('› Empaquetando y cifrando…');
  const zip = zipDir(dist);
  const { encrypted, sessionKey, checksum } = encryptBundle(
    zip,
    readFileSync(privatePath, 'utf8'),
    readFileSync(PUBLIC_KEY, 'utf8'),
  );
  console.log(`  ${appId} · ${channel} · ${version} · nativa ≥ ${minNative} · ${(encrypted.length / 1024 / 1024).toFixed(2)} MB`);

  if (opts['dry-run']) {
    const out = join(OTA_DIR, 'out');
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, `${version}.zip`), encrypted);
    writeFileSync(join(out, `${version}.json`), JSON.stringify({ appId, channel, version, minNativeVersion: minNative, checksum, sessionKey }, null, 2));
    console.log(`✓ Preparado en ${relative(process.cwd(), out)} (no se ha subido nada).`);
    return;
  }

  const email = env.OTA_EMAIL || (await ask('Email del backoffice: '));
  const password = env.OTA_PASSWORD || (await ask('Contraseña: ', true));
  const login = await fetch(`${api}/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) fail(`No se pudo iniciar sesión (${login.status}).`);
  const { accessToken } = await login.json();

  console.log('› Subiendo…');
  const form = new FormData();
  form.set('appId', appId);
  form.set('channel', channel);
  form.set('version', version);
  form.set('minNativeVersion', minNative);
  form.set('checksum', checksum);
  form.set('sessionKey', sessionKey);
  if (opts.notes) form.set('notes', String(opts.notes));
  form.set('file', new Blob([encrypted], { type: 'application/zip' }), `${version}.zip`);
  const res = await fetch(`${api}/v1/admin/ota/bundles`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    fail(`La API rechazó la subida (${res.status}): ${body.slice(0, 300)}`);
  }
  console.log(`✓ Publicada ${version}. Las apps la bajarán al volver a abrirse y se aplicará al pasar a segundo plano.`);
}

// Solo como comando (importado desde una prueba, no hace nada).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const opts = args(process.argv.slice(2));
  const cmd = opts._[0];
  if (cmd === 'keygen') keygen(opts);
  else if (cmd === 'publish') await publish(opts);
  else fail('Uso: node scripts/ota.mjs keygen | publish [--notes "…"] [--min-native 1.2.0] [--dry-run]');
}
