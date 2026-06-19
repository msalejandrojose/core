import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  ENV_NAMES,
  PART_NAMES,
  type EnvName,
  type PartName,
  type StackConfig,
} from './types.ts';

/** Error de validación de `stack.config.json`. */
export class StackConfigError extends Error {
  constructor(message: string) {
    super(`stack.config inválido: ${message}`);
    this.name = 'StackConfigError';
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Valida una config ya parseada y la devuelve tipada. Validación a mano (sin
 * dependencias) suficiente para el JSON Schema de `stack.schema.json`.
 */
export function parseStackConfig(raw: unknown): StackConfig {
  if (!isObject(raw)) throw new StackConfigError('debe ser un objeto');

  if (!isObject(raw.domains)) throw new StackConfigError('falta "domains"');
  for (const k of ['base', 'localBase'] as const) {
    if (typeof raw.domains[k] !== 'string' || !raw.domains[k]) {
      throw new StackConfigError(`domains.${k} debe ser un string no vacío`);
    }
  }

  if (!isObject(raw.parts)) throw new StackConfigError('falta "parts"');
  for (const name of PART_NAMES) {
    const part = raw.parts[name];
    if (!isObject(part)) throw new StackConfigError(`falta parts.${name}`);
    if (typeof part.enabled !== 'boolean') {
      throw new StackConfigError(`parts.${name}.enabled debe ser boolean`);
    }
    if (typeof part.subdomain !== 'string' || !part.subdomain) {
      throw new StackConfigError(`parts.${name}.subdomain debe ser string`);
    }
    if (
      typeof part.internalPort !== 'number' ||
      !Number.isInteger(part.internalPort) ||
      part.internalPort < 1 ||
      part.internalPort > 65535
    ) {
      throw new StackConfigError(`parts.${name}.internalPort inválido`);
    }
    if (
      part.runMode !== undefined &&
      part.runMode !== 'docker' &&
      part.runMode !== 'host'
    ) {
      throw new StackConfigError(`parts.${name}.runMode debe ser docker|host`);
    }
  }

  if (!isObject(raw.environments)) {
    throw new StackConfigError('falta "environments"');
  }
  for (const name of ENV_NAMES) {
    const env = raw.environments[name];
    if (!isObject(env)) throw new StackConfigError(`falta environments.${name}`);
    if (env.scheme !== 'http' && env.scheme !== 'https') {
      throw new StackConfigError(`environments.${name}.scheme debe ser http|https`);
    }
    if (typeof env.host !== 'string' || !env.host) {
      throw new StackConfigError(`environments.${name}.host debe ser string`);
    }
  }

  return raw as unknown as StackConfig;
}

/** Ruta por defecto de la config: la raíz del repo (dos niveles sobre este archivo). */
function defaultConfigPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '../../../stack.config.json');
}

/** Lee y valida `stack.config.json`. Si no se pasa ruta, usa la raíz del repo. */
export function loadStackConfig(path: string = defaultConfigPath()): StackConfig {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    throw new StackConfigError(`no se pudo leer ${path}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new StackConfigError(`JSON malformado en ${path}`);
  }
  return parseStackConfig(parsed);
}

/** Piezas habilitadas, en orden estable. */
export function enabledParts(config: StackConfig): PartName[] {
  return PART_NAMES.filter((name) => config.parts[name].enabled);
}

/**
 * URL pública de una pieza en un entorno. En `local` se usa `domains.localBase`
 * y el subdominio de la pieza, sin puerto (Caddy enruta por host).
 */
export function getUrl(
  config: StackConfig,
  part: PartName,
  env: EnvName = 'local',
): string {
  const { subdomain } = config.parts[part];
  const environment = config.environments[env];
  const base = env === 'local' ? config.domains.localBase : environment.host;
  return `${environment.scheme}://${subdomain}.${base}`;
}
