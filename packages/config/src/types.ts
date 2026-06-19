/** Identificadores de las piezas que pueden componer el stack. */
export type PartName = 'api' | 'backoffice' | 'web' | 'mobile';

/** Entornos soportados por la config (el script de arranque solo cubre `local`). */
export type EnvName = 'local' | 'staging' | 'prod';

/** Dónde corre una pieza: dentro de Docker o en el host (p. ej. `pnpm dev`). */
export type RunMode = 'docker' | 'host';

export interface PartConfig {
  /** Si es `false` la pieza no se construye, no se levanta ni se cablea. */
  enabled: boolean;
  /** Subdominio bajo el dominio base (p. ej. `api` → `api.aj-local.es`). */
  subdomain: string;
  /** Puerto interno en el que escucha la pieza. */
  internalPort: number;
  /** Modo de ejecución. Por defecto `host` para frontends y `docker` para la API. */
  runMode?: RunMode;
}

export interface EnvironmentConfig {
  scheme: 'http' | 'https';
  host: string;
}

export interface StackConfig {
  $schema?: string;
  domains: { base: string; localBase: string };
  parts: Record<PartName, PartConfig>;
  environments: Record<EnvName, EnvironmentConfig>;
}

export const PART_NAMES: readonly PartName[] = [
  'api',
  'backoffice',
  'web',
  'mobile',
];

export const ENV_NAMES: readonly EnvName[] = ['local', 'staging', 'prod'];
