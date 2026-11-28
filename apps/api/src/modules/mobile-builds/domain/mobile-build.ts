// Builds nativos de las apps móviles. Los compila el Mac Mini con el workflow
// `.github/workflows/mobile-build.yml` (runner self-hosted): aquí solo están las
// reglas de qué se puede pedir y cómo se lee un run de GitHub Actions.

import { InvalidMobileBuildError } from './mobile-builds.errors';

export const BUILD_PLATFORMS = ['ios', 'android'] as const;
export type BuildPlatform = (typeof BUILD_PLATFORMS)[number];

/** Perfiles de `apps/mobile/native.config.yml`. */
export const BUILD_PROFILES = [
  'device',
  'mac',
  'testflight',
  'production',
] as const;
export type BuildProfile = (typeof BUILD_PROFILES)[number];

export type BuildState =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

export interface LaunchBuild {
  platform: BuildPlatform;
  profile: BuildProfile;
  /** Móvil donde instalar (perfiles device/mac); vacío = el único emparejado. */
  device: string | null;
  buildNumber: number | null;
  /** Rama a compilar. */
  ref: string;
}

// Nombres de iPhone («iPhone de Alejandro Jose»), ids de devicectl e ip:puerto
// de adb. Llega al workflow como input y se usa en una variable de entorno,
// nunca interpolado en el script, pero se acota igualmente.
const DEVICE = /^[\p{L}\p{N} ._:'’()-]{1,80}$/u;
const REF = /^[A-Za-z0-9._/-]{1,100}$/;

export function cleanLaunch(input: {
  platform: string;
  profile: string;
  device?: string | null;
  buildNumber?: number | null;
  ref?: string | null;
  defaultRef: string;
}): LaunchBuild {
  if (!BUILD_PLATFORMS.includes(input.platform as BuildPlatform)) {
    throw new InvalidMobileBuildError(
      `plataforma «${input.platform}» desconocida`,
    );
  }
  if (!BUILD_PROFILES.includes(input.profile as BuildProfile)) {
    throw new InvalidMobileBuildError(`perfil «${input.profile}» desconocido`);
  }
  const device = input.device?.trim() || null;
  if (device && !DEVICE.test(device)) {
    throw new InvalidMobileBuildError(
      'el nombre del móvil tiene caracteres raros',
    );
  }
  const ref = input.ref?.trim() || input.defaultRef;
  if (!REF.test(ref) || ref.includes('..') || ref.startsWith('-')) {
    throw new InvalidMobileBuildError(`la rama «${ref}» no es válida`);
  }
  const buildNumber = input.buildNumber ?? null;
  if (
    buildNumber !== null &&
    (!Number.isInteger(buildNumber) ||
      buildNumber < 1 ||
      buildNumber > 2_000_000_000)
  ) {
    throw new InvalidMobileBuildError(
      'el número de build tiene que ser un entero positivo',
    );
  }
  return {
    platform: input.platform as BuildPlatform,
    profile: input.profile as BuildProfile,
    device,
    buildNumber,
    ref,
  };
}

/** Estado de un run a partir de `status` y `conclusion` de GitHub. */
export function buildState(
  status: string,
  conclusion: string | null,
): BuildState {
  if (status !== 'completed') {
    return status === 'in_progress' ? 'RUNNING' : 'QUEUED';
  }
  if (conclusion === 'success') return 'SUCCESS';
  if (conclusion === 'cancelled' || conclusion === 'skipped')
    return 'CANCELLED';
  return 'FAILED';
}

/**
 * Plataforma, perfil y móvil salen del título del run (`run-name` del
 * workflow: «ios · device · iPhone de …»): la API de GitHub no devuelve los
 * inputs de un run.
 */
export function parseRunTitle(title: string): {
  platform: BuildPlatform | null;
  profile: BuildProfile | null;
  device: string | null;
} {
  const [platform, profile, ...rest] = title.split(' · ').map((s) => s.trim());
  return {
    platform: BUILD_PLATFORMS.includes(platform as BuildPlatform)
      ? (platform as BuildPlatform)
      : null,
    profile: BUILD_PROFILES.includes(profile as BuildProfile)
      ? (profile as BuildProfile)
      : null,
    device: rest.join(' · ') || null,
  };
}
