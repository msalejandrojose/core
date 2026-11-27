import plist from 'plist';
import { describe, expect, it } from 'vitest';
import {
  buildEntitlements,
  defaultBuildNumber,
  patchAppBuildGradle,
  patchInfoPlist,
  patchManifest,
  patchPodfile,
  patchStoryboard,
  patchStrings,
  patchVariablesGradle,
} from './native-prepare.mjs';

// Trozos de las plantillas de Capacitor 8 (`cap add`).
const INFO_PLIST = plist.build({
  CFBundleDisplayName: 'Brío',
  CFBundleName: '$(PRODUCT_NAME)',
  UIMainStoryboardFile: 'Main',
});
const PODFILE = `require_relative '../pods_helpers'

platform :ios, '14.0'
use_frameworks!

def capacitor_pods
  pod 'Capacitor', :path => '../capacitor'
end

target 'App' do
  capacitor_pods
end

post_install do |installer|
  assertDeploymentTarget(installer)
end
`;
const BUILD_GRADLE = `android {
    defaultConfig {
        applicationId "es.aj.brio"
        minSdkVersion rootProject.ext.minSdkVersion
        versionCode 1
        versionName "1.0"
    }
}
`;
const MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application />

    <!-- Permissions -->

    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
`;
const STRINGS = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">Brío</string>
</resources>
`;

describe('iOS', () => {
  it('Info.plist: añade y pisa claves, y pone los esquemas de URL', () => {
    const out = plist.parse(
      patchInfoPlist(INFO_PLIST, {
        infoPlist: { CFBundleName: 'Brío', LSApplicationQueriesSchemes: ['hevy'], NSSupportsLiveActivities: true },
        urlTypes: [{ name: 'es.aj.brio', schemes: ['brio'] }],
      }),
    );
    expect(out).toMatchObject({
      CFBundleDisplayName: 'Brío',
      UIMainStoryboardFile: 'Main',
      CFBundleName: 'Brío',
      LSApplicationQueriesSchemes: ['hevy'],
      NSSupportsLiveActivities: true,
      CFBundleURLTypes: [{ CFBundleURLName: 'es.aj.brio', CFBundleURLSchemes: ['brio'] }],
    });
  });

  it('entitlements: plist con booleanos y arrays (vacíos también)', () => {
    const out = plist.parse(
      buildEntitlements({
        'com.apple.developer.healthkit': true,
        'com.apple.developer.healthkit.access': [],
        'com.apple.security.application-groups': ['group.es.aj.brio'],
      }),
    );
    expect(out['com.apple.developer.healthkit']).toBe(true);
    expect(out['com.apple.developer.healthkit.access']).toEqual([]);
    expect(out['com.apple.security.application-groups']).toEqual(['group.es.aj.brio']);
  });

  it('Podfile: iOS mínimo en la plataforma y en los pods, sin duplicar al repetir', () => {
    const once = patchPodfile(PODFILE, '15.0');
    expect(once).toContain("platform :ios, '15.0'");
    expect(once).not.toContain("'14.0'");
    expect(once).toMatch(
      /assertDeploymentTarget\(installer\)\n {2}# native\.config\.yml[\s\S]*IPHONEOS_DEPLOYMENT_TARGET'\] = '15\.0'[\s\S]*\nend\n$/,
    );
    expect(patchPodfile(once, '15.0')).toBe(once);
    expect(patchPodfile(once, '16.0').match(/IPHONEOS_DEPLOYMENT_TARGET/g)).toHaveLength(1);
  });

  it('Podfile sin post_install: lo crea', () => {
    const out = patchPodfile("platform :ios, '13.0'\n", '15.0');
    expect(out).toMatch(/post_install do \|installer\|\n {2}# native\.config\.yml[\s\S]*end\n$/);
  });

  it('storyboard: arranca con el controlador propio', () => {
    const xml = '<viewController id="BYZ" customClass="CAPBridgeViewController" customModule="Capacitor" sceneMemberID="viewController"/>';
    expect(patchStoryboard(xml, { class: 'BrioBridgeViewController', module: 'App' })).toBe(
      '<viewController id="BYZ" customClass="BrioBridgeViewController" customModule="App" customModuleProvider="target" sceneMemberID="viewController"/>',
    );
  });
});

describe('Android', () => {
  it('minSdk, applicationId y versión', () => {
    expect(patchVariablesGradle('ext {\n    minSdkVersion = 24\n}', 26)).toContain('minSdkVersion = 26');
    const out = patchAppBuildGradle(BUILD_GRADLE, { applicationId: 'es.aj.brio', versionCode: 42, versionName: '1.2.0' });
    expect(out).toContain('        versionCode 42\n');
    expect(out).toContain('        versionName "1.2.0"\n');
    expect(out).toContain('        applicationId "es.aj.brio"\n');
    expect(() => patchAppBuildGradle('android {}', { applicationId: 'x', versionCode: 1, versionName: '1' })).toThrow(/applicationId/);
  });

  it('manifest: añade los permisos que faltan, una vez', () => {
    const perms = ['android.permission.health.READ_HEALTH_DATA_HISTORY', 'android.permission.INTERNET'];
    const once = patchManifest(MANIFEST, perms);
    expect(once.match(/READ_HEALTH_DATA_HISTORY/g)).toHaveLength(1);
    expect(once.match(/permission\.INTERNET/g)).toHaveLength(1);
    expect(once.trimEnd().endsWith('</manifest>')).toBe(true);
    expect(patchManifest(once, perms)).toBe(once);
  });

  it('strings: añade, reemplaza y escapa', () => {
    const out = patchStrings(STRINGS, { app_name: 'Brío', policy: "https://x.es/?a=1&b='2'" });
    expect(out).toContain('<string name="app_name">Brío</string>');
    expect(out).toContain('<string name="policy">https://x.es/?a=1&amp;b=\\\'2\\\'</string>');
    expect(out.match(/name="app_name"/g)).toHaveLength(1);
  });
});

it('número de build: crece y cabe en versionCode hasta 2100', () => {
  const a = defaultBuildNumber(Date.UTC(2026, 10, 27, 10, 0));
  const b = defaultBuildNumber(Date.UTC(2026, 10, 27, 10, 1));
  expect(b).toBe(a + 1);
  expect(defaultBuildNumber(Date.UTC(2100, 0, 1))).toBeLessThan(2_100_000_000);
  expect(defaultBuildNumber(Date.UTC(2025, 0, 1))).toBe(1);
});
