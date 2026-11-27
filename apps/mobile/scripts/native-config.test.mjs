import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONFIG_FILE,
  NativeConfigError,
  googleReversedClientId,
  loadNativeConfig,
  parseNativeConfig,
  resolveNativeConfig,
} from './native-config.mjs';

const config = loadNativeConfig();
const TEAM = { APPLE_TEAM_ID: 'ABCDE12345' };
const PAID_IOS = { ...TEAM, APPLE_ACCOUNT: 'paid', ASC_KEY_ID: 'K', ASC_ISSUER_ID: 'I', ASC_KEY_PATH: '/k.p8' };
const ANDROID_RELEASE = {
  ANDROID_KEYSTORE_PATH: '/upload.jks',
  ANDROID_KEYSTORE_PASSWORD: 'secreto',
  ANDROID_KEY_ALIAS: 'upload',
  ANDROID_KEY_PASSWORD: 'secreto',
  PLAY_SERVICE_ACCOUNT_JSON: '/play.json',
};

function problems(fn) {
  try {
    fn();
  } catch (err) {
    expect(err).toBeInstanceOf(NativeConfigError);
    return err.problems.join('\n');
  }
  throw new Error('no ha fallado');
}

describe('native.config.yml', () => {
  it('el fichero del repo es válido y tiene los cuatro perfiles', () => {
    expect(Object.keys(config.profiles)).toEqual(['device', 'mac', 'testflight', 'production']);
  });

  it('device en iOS: lo de NATIVE.md, sin ATS ni lo de la cuenta de pago', () => {
    const { config: c } = resolveNativeConfig(config, { profile: 'device', platforms: ['ios'], env: TEAM });
    expect(c.web.env).toEqual({ VITE_API_URL: 'https://brio-api.ajly.online', CAP_SERVER_URL: '' });
    expect(c.ios).toMatchObject({ bundleId: 'es.aj.brio', teamId: 'ABCDE12345', account: 'free', signing: 'development', upload: null });
    expect(c.ios.infoPlist).toMatchObject({ CFBundleName: 'Brío', LSApplicationQueriesSchemes: ['hevy'], NSSupportsLiveActivities: true });
    expect(c.ios.infoPlist.NSAppTransportSecurity).toBeUndefined();
    expect(c.ios.entitlements['com.apple.security.application-groups']).toEqual(['group.es.aj.brio']);
    expect(c.ios.entitlements['com.apple.developer.applesignin']).toBeUndefined();
    expect(c.ios.urlTypes).toEqual([{ name: 'es.aj.brio', schemes: ['brio'] }]);
    expect(c.ios.extensions[0]).toMatchObject({ name: 'BrioWidgets', bundleId: 'es.aj.brio.widgets' });
    expect(c.ios.appStoreConnect).toBeNull();
    expect(c.android).toBeUndefined();
  });

  it('solo pide las variables de la plataforma que se compila', () => {
    const { config: c, warnings } = resolveNativeConfig(config, { profile: 'device', platforms: ['android'], env: {} });
    expect(c.android).toMatchObject({ packageName: 'es.aj.brio', buildType: 'debug', output: 'apk', signing: null, play: null });
    // La URL de la política de privacidad aún no existe: no se añade y avisa.
    expect(c.android.strings).toEqual({});
    expect(warnings.join()).toMatch(/health_connect_privacy_policy_url/);
    expect(problems(() => resolveNativeConfig(config, { profile: 'device', platforms: ['ios'], env: {} }))).toMatch(
      /APPLE_TEAM_ID/,
    );
  });

  it('TestFlight con la cuenta gratuita no se puede', () => {
    expect(problems(() => resolveNativeConfig(config, { profile: 'testflight', platforms: ['ios'], env: TEAM }))).toMatch(
      /cuenta de pago/,
    );
  });

  it('testflight con la cuenta de pago: Sign in with Apple, clave de App Store Connect y firma de Android', () => {
    const { config: c } = resolveNativeConfig(config, { profile: 'testflight', env: { ...PAID_IOS, ...ANDROID_RELEASE } });
    expect(c.ios.entitlements['com.apple.developer.applesignin']).toEqual(['Default']);
    expect(c.web.env.VITE_APPLE_SIGN_IN).toBe('true');
    expect(c.ios.appStoreConnect).toEqual({ keyId: 'K', issuerId: 'I', keyPath: '/k.p8' });
    expect(c.android).toMatchObject({ buildType: 'release', output: 'aab', upload: 'internal' });
    expect(c.android.signing.keyAlias).toBe('upload');
  });

  it('lista todas las variables que faltan de una vez', () => {
    const msg = problems(() => resolveNativeConfig(config, { profile: 'production', platforms: ['android'], env: {} }));
    for (const v of ['ANDROID_KEYSTORE_PATH', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_ALIAS', 'ANDROID_KEY_PASSWORD', 'PLAY_SERVICE_ACCOUNT_JSON']) {
      expect(msg).toContain(v);
    }
  });

  it('mac: web del Mac por http, con ATS abierto', () => {
    const env = { ...TEAM, VITE_API_URL: 'http://10.0.0.2:3000', CAP_SERVER_URL: 'http://10.0.0.2:4410' };
    const { config: c } = resolveNativeConfig(config, { profile: 'mac', platforms: ['ios'], env });
    expect(c.web.env).toEqual({ VITE_API_URL: 'http://10.0.0.2:3000', CAP_SERVER_URL: 'http://10.0.0.2:4410' });
    expect(c.ios.infoPlist.NSAppTransportSecurity).toEqual({ NSAllowsArbitraryLoads: true });
    expect(problems(() => resolveNativeConfig(config, { profile: 'mac', platforms: ['ios'], env: TEAM }))).toMatch(
      /CAP_SERVER_URL/,
    );
  });

  it('añade el esquema de URL del login con Google', () => {
    const env = { ...TEAM, VITE_GOOGLE_IOS_CLIENT_ID: '123-abc.apps.googleusercontent.com' };
    const { config: c, warnings } = resolveNativeConfig(config, { profile: 'device', platforms: ['ios'], env });
    expect(c.ios.urlTypes).toContainEqual({ name: 'google', schemes: ['com.googleusercontent.apps.123-abc'] });
    expect(warnings.join()).not.toMatch(/Google/);
    expect(googleReversedClientId('otra-cosa')).toBeNull();
  });

  it('rechaza claves desconocidas y una API por http sin allowHttp', () => {
    const text = readFileSync(CONFIG_FILE, 'utf8');
    expect(problems(() => parseNativeConfig(text.replace('schema: 1', 'schema: 1\nbundle: x')))).toMatch(/bundle/);
    const http = parseNativeConfig(text);
    http.profiles.device.web.apiUrl = 'http://10.0.0.2:3000';
    expect(problems(() => resolveNativeConfig(http, { profile: 'device', platforms: ['android'] }))).toMatch(/allowHttp/);
  });

  it('comprueba que existe el código nativo y que la versión admite las OTA', () => {
    const broken = parseNativeConfig(readFileSync(CONFIG_FILE, 'utf8'));
    broken.ios.sources.push('native/ios/NoExiste');
    broken.app.version = '0.9.0';
    const msg = problems(() => resolveNativeConfig(broken, { profile: 'device', platforms: ['ios'], env: TEAM }));
    expect(msg).toMatch(/native\/ios\/NoExiste/);
    expect(msg).toMatch(/minNativeVersion/);
  });
});
