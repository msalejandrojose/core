// Genera `ios/` y `android/` desde cero a partir de native.config.yml.
//
// Uso (desde apps/mobile):
//   pnpm native:prepare --profile device --platform ios
//   pnpm native:prepare --profile testflight --build-number 42
//
// Pasos: valida la config del perfil → compila la web con las variables del
// perfil → borra y vuelve a crear cada plataforma (`cap add`) → aplica la config
// (Info.plist, entitlements, Podfile, proyecto de Xcode con los widgets;
// manifest, strings y Gradle en Android) → iconos y splash → `cap sync`.
//
// Opciones:
//   --profile, -p     perfil de native.config.yml (por defecto device)
//   --platform        ios | android (se puede repetir; por defecto las dos)
//   --build-number    número de build (CFBundleVersion / versionCode). Por
//                     defecto, minutos desde el 1-1-2026 (siempre crece).
//   --skip-web        no recompilar la web (usa el dist/ que haya)
//
// Lo que no se puede hacer fuera de un Mac (pod install, firmar) se lo salta
// `cap` solo; el resto funciona igual en Linux.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import plist from 'plist';
import {
  MOBILE_ROOT,
  NativeConfigError,
  PLATFORMS,
  loadNativeConfig,
  loadNativeEnv,
  resolveNativeConfig,
} from './native-config.mjs';

const MARK = 'native.config.yml';

// --- iOS: transformaciones puras ---------------------------------------------

/** Info.plist de la app: claves del YAML (pisan las de la plantilla) y esquemas de URL. */
export function patchInfoPlist(xml, ios) {
  const data = plist.parse(xml);
  Object.assign(data, structuredClone(ios.infoPlist));
  if (ios.urlTypes.length) {
    data.CFBundleURLTypes = ios.urlTypes.map((t) => ({ CFBundleURLName: t.name, CFBundleURLSchemes: t.schemes }));
  }
  return plist.build(data);
}

export function buildEntitlements(entitlements) {
  return plist.build(entitlements);
}

/** Podfile: iOS mínimo en la plataforma y forzado en todos los pods. */
export function patchPodfile(text, deploymentTarget) {
  let out = text.replace(/^platform :ios, .*$/m, `platform :ios, '${deploymentTarget}'`);
  if (!/^platform :ios/m.test(out)) out = `platform :ios, '${deploymentTarget}'\n${out}`;
  // Cada bloque generado lleva la marca, para no duplicarlo al repetir.
  out = out.replace(new RegExp(`\\n  # ${MARK}: iOS mínimo[\\s\\S]*?# /${MARK}\\n`), '\n');
  const block = [
    `  # ${MARK}: iOS mínimo en todos los pods`,
    '  installer.pods_project.targets.each do |target|',
    '    target.build_configurations.each do |config|',
    `      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'`,
    '    end',
    '  end',
    `  # /${MARK}`,
    '',
  ].join('\n');
  if (/^post_install do \|installer\|\n/m.test(out)) {
    return out.replace(/^(post_install do \|installer\|\n(?:.*assertDeploymentTarget.*\n)?)/m, `$1${block}`);
  }
  return `${out.trimEnd()}\n\npost_install do |installer|\n${block}end\n`;
}

/** Main.storyboard arranca con el controlador propio (registra los plugins nativos). */
export function patchStoryboard(xml, { class: cls, module }) {
  return xml.replace(
    /customClass="CAPBridgeViewController" customModule="Capacitor"/,
    `customClass="${cls}" customModule="${module}" customModuleProvider="target"`,
  );
}

// --- Android: transformaciones puras -----------------------------------------

export function patchVariablesGradle(text, minSdk) {
  if (!/minSdkVersion = \d+/.test(text)) throw new Error('variables.gradle: no encuentro minSdkVersion');
  return text.replace(/minSdkVersion = \d+/, `minSdkVersion = ${minSdk}`);
}

export function patchAppBuildGradle(text, { applicationId, versionCode, versionName }) {
  for (const key of ['applicationId', 'versionCode', 'versionName']) {
    if (!new RegExp(`^\\s+${key} `, 'm').test(text)) throw new Error(`app/build.gradle: no encuentro ${key}`);
  }
  return text
    .replace(/^(\s+)applicationId .*$/m, `$1applicationId "${applicationId}"`)
    .replace(/^(\s+)versionCode .*$/m, `$1versionCode ${versionCode}`)
    .replace(/^(\s+)versionName .*$/m, `$1versionName "${versionName}"`);
}

export function patchManifest(xml, permissions) {
  const missing = permissions.filter((p) => !xml.includes(`android:name="${p}"`));
  if (!missing.length) return xml;
  const lines = missing.map((p) => `    <uses-permission android:name="${p}" />`).join('\n');
  return xml.replace(/\n?<\/manifest>\s*$/, `\n    <!-- ${MARK} -->\n${lines}\n</manifest>\n`);
}

function escapeAndroidString(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}

export function patchStrings(xml, strings) {
  let out = xml;
  for (const [name, value] of Object.entries(strings)) {
    const line = `<string name="${name}">${escapeAndroidString(value)}</string>`;
    const existing = new RegExp(`<string name="${name}">[\\s\\S]*?</string>`);
    out = existing.test(out) ? out.replace(existing, line) : out.replace(/<\/resources>/, `    ${line}\n</resources>`);
  }
  return out;
}

// --- Orquestación ------------------------------------------------------------

/** Minutos desde el 1-1-2026: crece siempre y cabe de sobra en versionCode. */
export function defaultBuildNumber(now = Date.now()) {
  return Math.max(1, Math.floor((now - Date.UTC(2026, 0, 1)) / 60000));
}

function run(cmd, args, env) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: MOBILE_ROOT, env, stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`Falló: ${cmd} ${args.join(' ')}`);
}

function edit(file, fn) {
  writeFileSync(file, fn(readFileSync(file, 'utf8')));
}

function prepareIos(ios, app, build, env) {
  const iosDir = join(MOBILE_ROOT, 'ios');
  rmSync(iosDir, { recursive: true, force: true });
  // Capacitor 8 crea SPM por defecto; con CocoaPods se mantiene App.xcworkspace.
  run('pnpm', ['exec', 'cap', 'add', 'ios', '--packagemanager', ios.packageManager], env);

  const appDir = join(iosDir, 'App', 'App');
  edit(join(appDir, 'Info.plist'), (xml) => patchInfoPlist(xml, ios));
  writeFileSync(join(appDir, 'App.entitlements'), buildEntitlements(ios.entitlements));
  edit(join(appDir, 'Base.lproj', 'Main.storyboard'), (xml) => patchStoryboard(xml, ios.rootViewController));
  const podfile = join(iosDir, 'App', 'Podfile');
  if (existsSync(podfile)) edit(podfile, (t) => patchPodfile(t, ios.deploymentTarget));

  const abs = (p) => join(MOBILE_ROOT, p);
  // En los build settings, rutas relativas al proyecto: no dependen de la máquina.
  const fromProject = (p) => `$(SRCROOT)/${relative(join(iosDir, 'App'), abs(p))}`;
  const tmp = mkdtempSync(join(tmpdir(), 'native-prepare-'));
  const json = join(tmp, 'ios.json');
  writeFileSync(
    json,
    JSON.stringify({
      iosDir: join(iosDir, 'App'),
      bundleId: ios.bundleId,
      version: app.version,
      build,
      teamId: ios.teamId,
      deploymentTarget: ios.deploymentTarget,
      entitlements: 'App/App.entitlements',
      sources: ios.sources.map(abs),
      extensions: ios.extensions.map((e) => ({
        ...e,
        sources: e.sources.map(abs),
        infoPlistFile: abs(e.infoPlist),
        infoPlist: fromProject(e.infoPlist),
        entitlements: fromProject(e.entitlements),
      })),
    }),
  );
  try {
    run('ruby', [join(MOBILE_ROOT, 'scripts', 'ios-project.rb'), json], env);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function prepareAndroid(android, app, build, env) {
  const androidDir = join(MOBILE_ROOT, 'android');
  rmSync(androidDir, { recursive: true, force: true });
  run('pnpm', ['exec', 'cap', 'add', 'android'], env);

  edit(join(androidDir, 'variables.gradle'), (t) => patchVariablesGradle(t, android.minSdk));
  edit(join(androidDir, 'app', 'build.gradle'), (t) =>
    patchAppBuildGradle(t, { applicationId: android.packageName, versionCode: build, versionName: app.version }),
  );
  const main = join(androidDir, 'app', 'src', 'main');
  edit(join(main, 'AndroidManifest.xml'), (xml) => patchManifest(xml, android.permissions));
  edit(join(main, 'res', 'values', 'strings.xml'), (xml) => patchStrings(xml, android.strings));
}

export function prepare({ profile, platforms, buildNumber, skipWeb }) {
  const { config, warnings } = resolveNativeConfig(loadNativeConfig(), {
    profile,
    platforms,
    env: loadNativeEnv(),
  });
  for (const w of warnings) console.warn(`aviso: ${w}`);
  const build = buildNumber ?? defaultBuildNumber();
  console.log(`Perfil ${profile} · ${platforms.join(' + ')} · ${config.app.id} ${config.app.version} (${build})`);

  // Las variables del perfil pisan las de .env.production.local, tanto en el
  // build de la web como en capacitor.config.ts (lo lee al hacer `cap`).
  const env = { ...process.env, ...config.web.env, LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' };

  if (!skipWeb) {
    run('pnpm', ['--filter', '@core/api-client', 'generate:offline'], env);
    run('pnpm', ['exec', 'tsc', '--noEmit'], env);
    run('pnpm', ['exec', 'vite', 'build'], env);
  } else if (!existsSync(join(MOBILE_ROOT, 'dist', 'index.html'))) {
    throw new Error('--skip-web sin dist/: compila la web antes (pnpm build)');
  }

  if (config.ios) prepareIos(config.ios, config.app, build, env);
  if (config.android) prepareAndroid(config.android, config.app, build, env);

  const r = config.resources;
  run(
    'pnpm',
    [
      'exec', 'capacitor-assets', 'generate',
      ...platforms.map((p) => `--${p}`),
      '--assetPath', r.dir,
      '--iconBackgroundColor', r.iconBackground,
      '--iconBackgroundColorDark', r.iconBackgroundDark,
      '--splashBackgroundColor', r.splashBackground,
      '--splashBackgroundColorDark', r.splashBackgroundDark,
    ],
    env,
  );
  for (const p of platforms) run('pnpm', ['exec', 'cap', 'sync', p], env);

  console.log(`\n✓ ${platforms.join(' y ')} listo${platforms.length > 1 ? 's' : ''} para el perfil ${profile} (build ${build}).`);
  return { config, build };
}

function main() {
  const { values } = parseArgs({
    options: {
      profile: { type: 'string', short: 'p', default: 'device' },
      platform: { type: 'string', multiple: true },
      'build-number': { type: 'string' },
      'skip-web': { type: 'boolean', default: false },
    },
  });
  const platforms = values.platform?.length ? values.platform : [...PLATFORMS];
  const unknown = platforms.filter((p) => !PLATFORMS.includes(p));
  if (unknown.length) {
    console.error(`Plataforma desconocida: ${unknown.join(', ')} (ios | android)`);
    process.exit(1);
  }
  let buildNumber;
  if (values['build-number'] !== undefined) {
    buildNumber = Number(values['build-number']);
    if (!Number.isInteger(buildNumber) || buildNumber < 1) {
      console.error('--build-number tiene que ser un entero positivo');
      process.exit(1);
    }
  }
  try {
    prepare({ profile: values.profile, platforms, buildNumber, skipWeb: values['skip-web'] });
  } catch (err) {
    console.error(err instanceof NativeConfigError ? err.message : `\n✗ ${err.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
