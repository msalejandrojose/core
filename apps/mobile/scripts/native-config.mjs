// Lee `native.config.yml`, lo valida y lo resuelve para un perfil y una o las
// dos plataformas: rellena las variables `${VAR}` / `${VAR:-x}`, aplica lo que
// depende del perfil (ATS con `http`, lo que solo va con la cuenta de pago de
// Apple…) y devuelve lo que necesita el build. Solo pide las variables que usa
// lo que se va a compilar.
//
// Uso (desde apps/mobile):
//   node scripts/native-config.mjs --profile device --platform ios
//   pnpm native:config --profile testflight          (las dos plataformas)
//   … --show-secrets   sin tapar las contraseñas (lo usa fastlane)
//
// Las variables salen del entorno y de los `.env*` de modo production (como el
// `vite build` de la app); las del entorno mandan.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import plist from 'plist';
import { loadEnv } from 'vite';
import { parse } from 'yaml';
import { z } from 'zod';

export const MOBILE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CONFIG_FILE = join(MOBILE_ROOT, 'native.config.yml');
export const PLATFORMS = /** @type {const} */ (['ios', 'android']);

export class NativeConfigError extends Error {
  /** @param {string[]} problems */
  constructor(problems) {
    super(`native.config.yml:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'NativeConfigError';
    this.problems = problems;
  }
}

// --- Esquema -----------------------------------------------------------------
// Los campos que admiten `${VAR}` son strings: el tipo real (enum, URL…) se
// comprueba después de rellenarlos.

const str = z.string().min(1);
const version = z.string().regex(/^\d+\.\d+\.\d+$/, 'tiene que ser X.Y.Z');
const iosVersion = z.string().regex(/^\d+\.\d+$/, 'tiene que ser X.Y (p. ej. "15.0")');
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'tiene que ser un color #rrggbb');
/** @type {z.ZodType} */
const plistValue = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.array(plistValue), z.record(z.string(), plistValue)]),
);
const plistDict = z.record(z.string(), plistValue);

const profileSchema = z.strictObject({
  description: str,
  web: z.strictObject({
    apiUrl: str,
    serverUrl: str.optional(),
    allowHttp: z.boolean().default(false),
  }),
  ios: z.strictObject({
    signing: z.enum(['development', 'app-store']),
    upload: z.enum(['testflight', 'app-store']).optional(),
  }),
  android: z.strictObject({
    buildType: z.enum(['debug', 'release']),
    output: z.enum(['apk', 'aab']),
    upload: z.enum(['internal', 'alpha', 'beta', 'production']).optional(),
  }),
});

const configSchema = z.strictObject({
  schema: z.literal(1),
  app: z.strictObject({ id: str, name: str, version }),
  resources: z.strictObject({
    dir: str,
    iconBackground: color,
    iconBackgroundDark: color,
    splashBackground: color,
    splashBackgroundDark: color,
  }),
  apple: z.strictObject({ account: str, teamId: str }),
  profiles: z.record(z.string().regex(/^[a-z][a-z0-9-]*$/, 'nombre de perfil en minúsculas'), profileSchema),
  ios: z.strictObject({
    deploymentTarget: iosVersion,
    packageManager: z.enum(['CocoaPods', 'SPM']),
    infoPlist: plistDict,
    urlTypes: z.array(z.strictObject({ name: str, schemes: z.array(str).min(1) })),
    entitlements: plistDict,
    paidAccountOnly: z.strictObject({
      entitlements: plistDict.default({}),
      web: z.record(z.string(), z.string()).default({}),
    }),
    rootViewController: z.strictObject({ class: str, module: str }),
    sources: z.array(str),
    extensions: z.array(
      z.strictObject({
        name: str,
        kind: z.enum(['widgetkit']),
        bundleIdSuffix: z.string().regex(/^\.[a-zA-Z0-9.-]+$/, 'tiene que empezar por punto (p. ej. ".widgets")'),
        deploymentTarget: iosVersion,
        sources: z.array(str).min(1),
        infoPlist: str,
        entitlements: str,
        frameworks: z.array(str),
      }),
    ),
    appStoreConnect: z.strictObject({ keyId: str, issuerId: str, keyPath: str }),
  }),
  android: z.strictObject({
    minSdk: z.number().int().min(23),
    permissions: z.array(str),
    strings: z.record(z.string(), z.string()),
    signing: z.strictObject({ keystorePath: str, keystorePassword: str, keyAlias: str, keyPassword: str }),
    play: z.strictObject({ serviceAccountJson: str }),
  }),
  integrations: z.strictObject({
    google: z.strictObject({ iosClientId: z.string() }).optional(),
  }),
});

/** Parsea y valida el YAML (estructura; las variables aún sin rellenar). */
export function parseNativeConfig(text) {
  let data;
  try {
    data = parse(text);
  } catch (err) {
    throw new NativeConfigError([`YAML inválido: ${err.message}`]);
  }
  const result = configSchema.safeParse(data);
  if (!result.success) {
    throw new NativeConfigError(
      result.error.issues.map((i) => `${i.path.join('.') || '(raíz)'}: ${i.message}`),
    );
  }
  return result.data;
}

export function loadNativeConfig(file = CONFIG_FILE) {
  return parseNativeConfig(readFileSync(file, 'utf8'));
}

// --- Variables ---------------------------------------------------------------

const VAR = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g;

/**
 * Rellena `${VAR}` y `${VAR:-x}` en strings, arrays y objetos. Una variable
 * vacía cuenta como no definida. Las que faltan se apuntan en `missing`.
 */
function interpolate(value, env, missing, path) {
  if (typeof value === 'string') {
    return value.replace(VAR, (_, name, fallback) => {
      const v = env[name];
      if (v !== undefined && v !== '') return v;
      if (fallback !== undefined) return fallback;
      if (!missing.has(name)) missing.set(name, path);
      return '';
    });
  }
  if (Array.isArray(value)) return value.map((v, i) => interpolate(v, env, missing, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, interpolate(v, env, missing, `${path}.${k}`)]),
    );
  }
  return value;
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  }
  return 0;
}

/** `123-abc.apps.googleusercontent.com` → `com.googleusercontent.apps.123-abc`. */
export function googleReversedClientId(clientId) {
  const suffix = '.apps.googleusercontent.com';
  if (!clientId.endsWith(suffix)) return null;
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

// --- Resolver ----------------------------------------------------------------

/**
 * Resuelve la config para un perfil.
 * @param {ReturnType<typeof parseNativeConfig>} config
 * @param {{ profile: string, platforms?: readonly ('ios'|'android')[], env?: Record<string, string | undefined>, root?: string }} options
 * @returns {{ config: object, warnings: string[] }}
 */
export function resolveNativeConfig(config, { profile, platforms = PLATFORMS, env = {}, root = MOBILE_ROOT }) {
  const p = config.profiles[profile];
  if (!p) {
    throw new NativeConfigError([
      `no existe el perfil «${profile}» (hay: ${Object.keys(config.profiles).join(', ')})`,
    ]);
  }
  const problems = [];
  const warnings = [];
  const missing = new Map();
  const fill = (value, path) => interpolate(value, env, missing, path);
  const mustExist = (rel, path) => {
    if (!existsSync(join(root, rel))) problems.push(`${path}: no existe ${rel}`);
  };

  // Web que va dentro de la app.
  const web = fill(p.web, `profiles.${profile}.web`);
  const webEnv = { VITE_API_URL: web.apiUrl, CAP_SERVER_URL: web.serverUrl ?? '' };
  for (const [key, url] of [['apiUrl', web.apiUrl], ['serverUrl', web.serverUrl]]) {
    if (!url) continue;
    if (!/^https?:\/\//.test(url)) {
      problems.push(`profiles.${profile}.web.${key}: «${url}» no es una URL http(s)`);
    } else if (url.startsWith('http://') && !web.allowHttp) {
      problems.push(`profiles.${profile}.web.${key}: va por http; pon allowHttp: true (solo para pruebas)`);
    }
  }

  // La versión nativa tiene que admitir las OTA que se publiquen para ella.
  const otaFile = join(root, 'ota', 'config.json');
  if (existsSync(otaFile)) {
    const { minNativeVersion } = JSON.parse(readFileSync(otaFile, 'utf8'));
    if (minNativeVersion && compareVersions(config.app.version, minNativeVersion) < 0) {
      problems.push(`app.version ${config.app.version} es menor que minNativeVersion ${minNativeVersion} (ota/config.json)`);
    }
  }
  mustExist(config.resources.dir, 'resources.dir');

  const out = {
    profile,
    description: p.description,
    app: config.app,
    resources: config.resources,
    web: { allowHttp: web.allowHttp, env: webEnv },
  };

  if (platforms.includes('ios')) {
    const apple = fill(config.apple, 'apple');
    if (!['free', 'paid'].includes(apple.account)) {
      problems.push(`apple.account: «${apple.account}» tiene que ser free o paid`);
    }
    const paid = apple.account === 'paid';
    if (p.ios.signing === 'app-store' && !paid) {
      problems.push(
        `profiles.${profile}.ios: firmar para la App Store/TestFlight necesita la cuenta de pago (APPLE_ACCOUNT=paid)`,
      );
    }

    const ios = config.ios;
    const infoPlist = fill(ios.infoPlist, 'ios.infoPlist');
    if (web.allowHttp) infoPlist.NSAppTransportSecurity = { NSAllowsArbitraryLoads: true };

    const entitlements = {
      ...fill(ios.entitlements, 'ios.entitlements'),
      ...(paid ? fill(ios.paidAccountOnly.entitlements, 'ios.paidAccountOnly.entitlements') : {}),
    };
    if (paid) Object.assign(webEnv, fill(ios.paidAccountOnly.web, 'ios.paidAccountOnly.web'));

    const urlTypes = fill(ios.urlTypes, 'ios.urlTypes');
    const googleId = config.integrations.google
      ? fill(config.integrations.google.iosClientId, 'integrations.google.iosClientId')
      : '';
    if (googleId) {
      const scheme = googleReversedClientId(googleId);
      if (scheme) urlTypes.push({ name: 'google', schemes: [scheme] });
      else problems.push('integrations.google.iosClientId: no acaba en .apps.googleusercontent.com');
    } else {
      warnings.push('iOS sin integrations.google.iosClientId: el login con Google no funcionará');
    }

    ios.sources.forEach((s, i) => mustExist(s, `ios.sources[${i}]`));
    const appGroups = entitlements['com.apple.security.application-groups'] ?? [];
    const extensions = ios.extensions.map((ext, i) => {
      ext.sources.forEach((s, j) => mustExist(s, `ios.extensions[${i}].sources[${j}]`));
      mustExist(ext.infoPlist, `ios.extensions[${i}].infoPlist`);
      const entFile = join(root, ext.entitlements);
      if (!existsSync(entFile)) {
        problems.push(`ios.extensions[${i}].entitlements: no existe ${ext.entitlements}`);
      } else {
        // La extensión solo ve lo que deja la app si comparten App Group.
        const extGroups = plist.parse(readFileSync(entFile, 'utf8'))['com.apple.security.application-groups'] ?? [];
        const notInApp = extGroups.filter((g) => !appGroups.includes(g));
        if (notInApp.length) {
          problems.push(
            `ios.extensions[${i}]: el App Group ${notInApp.join(', ')} de ${ext.entitlements} no está en ios.entitlements`,
          );
        }
      }
      return { ...ext, bundleId: `${config.app.id}${ext.bundleIdSuffix}` };
    });

    out.ios = {
      bundleId: config.app.id,
      teamId: apple.teamId,
      account: apple.account,
      signing: p.ios.signing,
      upload: p.ios.upload ?? null,
      deploymentTarget: ios.deploymentTarget,
      packageManager: ios.packageManager,
      infoPlist,
      urlTypes,
      entitlements,
      rootViewController: ios.rootViewController,
      sources: ios.sources,
      extensions,
      appStoreConnect: p.ios.upload ? fill(ios.appStoreConnect, 'ios.appStoreConnect') : null,
    };
  }

  if (platforms.includes('android')) {
    const android = config.android;
    const strings = {};
    for (const [key, value] of Object.entries(fill(android.strings, 'android.strings'))) {
      if (value) strings[key] = value;
      else warnings.push(`android.strings.${key} está vacío: no se añade`);
    }
    if (p.android.upload && p.android.output !== 'aab') {
      problems.push(`profiles.${profile}.android: Google Play solo acepta output: aab`);
    }
    const release = p.android.buildType === 'release';
    if ((p.android.upload || p.android.output === 'aab') && !release) {
      problems.push(`profiles.${profile}.android: un aab o una subida a Play tiene que ser buildType: release`);
    }
    out.android = {
      packageName: config.app.id,
      minSdk: android.minSdk,
      permissions: android.permissions,
      strings,
      buildType: p.android.buildType,
      output: p.android.output,
      upload: p.android.upload ?? null,
      signing: release ? fill(android.signing, 'android.signing') : null,
      play: p.android.upload ? fill(android.play, 'android.play') : null,
    };
  }

  if (missing.size) {
    problems.push(
      `faltan variables: ${[...missing].map(([name, path]) => `${name} (${path})`).join(', ')}`,
    );
  }
  if (problems.length) throw new NativeConfigError(problems);
  return { config: out, warnings };
}

/** Variables para `${VAR}`: los `.env*` de modo production y el entorno (manda). */
export function loadNativeEnv(root = MOBILE_ROOT) {
  return loadEnv('production', root, '');
}

// --- CLI ---------------------------------------------------------------------

const SECRET_KEYS = new Set(['keystorePassword', 'keyPassword']);

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.has(k) && v ? '***' : redact(v)]),
    );
  }
  return value;
}

function main() {
  const { values } = parseArgs({
    options: {
      profile: { type: 'string', short: 'p', default: 'device' },
      platform: { type: 'string', multiple: true },
      // Para fastlane, que lee la salida en memoria: sin él, las contraseñas salen como ***.
      'show-secrets': { type: 'boolean', default: false },
    },
  });
  const platforms = values.platform?.length ? values.platform : [...PLATFORMS];
  const unknown = platforms.filter((p) => !PLATFORMS.includes(p));
  if (unknown.length) {
    console.error(`Plataforma desconocida: ${unknown.join(', ')} (ios | android)`);
    process.exit(1);
  }
  try {
    const env = loadNativeEnv();
    const { config, warnings } = resolveNativeConfig(loadNativeConfig(), {
      profile: values.profile,
      platforms,
      env,
    });
    for (const w of warnings) console.error(`aviso: ${w}`);
    console.log(JSON.stringify(values['show-secrets'] ? config : redact(config), null, 2));
  } catch (err) {
    console.error(err instanceof NativeConfigError ? err.message : err);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
