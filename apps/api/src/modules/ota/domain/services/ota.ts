/**
 * Reglas puras de las actualizaciones en caliente (OTA): qué versión le toca a
 * cada app según su versión nativa, qué zips se pueden borrar del storage y
 * cómo se valida lo que se sube. Sin Nest ni Prisma.
 */

import type { OtaBundle } from '../entities/ota-bundle.entity';

export const DEFAULT_CHANNEL = 'production';
/** Zips que se guardan por app y canal; los más viejos se borran del storage. */
export const DEFAULT_KEEP_BUNDLES = 5;
/** Tamaño máximo de un zip (la web de la app ronda unos pocos MB). */
export const MAX_BUNDLE_BYTES = 60 * 1024 * 1024;

const APP_ID = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i;
const VERSION = /^[0-9A-Za-z][0-9A-Za-z.+_-]{0,59}$/;
const NATIVE_VERSION = /^\d+(\.\d+){0,3}$/;
const CHANNEL = /^[a-z0-9-]{1,40}$/;
const HEX = /^[0-9a-f]+$/i;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Compara versiones nativas («1.4.2» frente a «1.10»): por números, de
 * izquierda a derecha; lo que falta cuenta como 0. Lo que no es número se ignora.
 */
export function compareNative(a: string, b: string): number {
  const parts = (v: string) =>
    v
      .split(/[.+-]/)
      .map((x) => Number.parseInt(x, 10))
      .filter((n) => Number.isFinite(n));
  const pa = parts(a);
  const pb = parts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

type Servable = Pick<
  OtaBundle,
  'isEnabled' | 'purgedAt' | 'minNativeVersion' | 'createdAt'
>;

const newestFirst = <T extends Pick<OtaBundle, 'createdAt'>>(list: T[]) =>
  [...list].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

/**
 * La actualización que le toca a una app con esa versión nativa: la más
 * reciente activa (no desactivada ni borrada) que no pida una versión nativa
 * mayor. Sin versión nativa conocida, la más reciente activa.
 */
export function pickBundle<T extends Servable>(
  bundles: T[],
  nativeVersion: string | null,
): T | null {
  return (
    newestFirst(bundles).find(
      (b) =>
        b.isEnabled &&
        !b.purgedAt &&
        (!nativeVersion ||
          compareNative(b.minNativeVersion, nativeVersion) <= 0),
    ) ?? null
  );
}

/**
 * Zips de una app y canal que se pueden borrar del storage: todo lo que no
 * esté entre los `keep` más recientes. Nunca se borra uno que todavía se
 * sirve: la más reciente activa de cada versión nativa mínima (los teléfonos
 * con una versión nativa vieja siguen bajándose esa).
 */
export function bundlesToPurge<T extends Servable & Pick<OtaBundle, 'id'>>(
  bundles: T[],
  keep: number,
): T[] {
  const alive = newestFirst(bundles.filter((b) => !b.purgedAt));
  const protect = new Set(alive.slice(0, Math.max(1, keep)).map((b) => b.id));
  const tiers = new Set<string>();
  for (const b of alive) {
    if (!b.isEnabled || tiers.has(b.minNativeVersion)) continue;
    tiers.add(b.minNativeVersion);
    protect.add(b.id);
  }
  return alive.filter((b) => !protect.has(b.id));
}

export interface PublishInput {
  appId: string;
  channel?: string | null;
  version: string;
  minNativeVersion: string;
  checksum: string;
  sessionKey: string;
  sizeBytes: number;
  notes?: string | null;
}

export type CleanPublish = Required<Omit<PublishInput, 'notes' | 'channel'>> & {
  channel: string;
  notes: string | null;
};

/** Valida lo que llega del script de publicación; devuelve el motivo si falla. */
export function cleanPublish(input: PublishInput): CleanPublish | string {
  const appId = input.appId?.trim() ?? '';
  const channel = (input.channel?.trim() || DEFAULT_CHANNEL).toLowerCase();
  const version = input.version?.trim() ?? '';
  const minNativeVersion = input.minNativeVersion?.trim() ?? '';
  const checksum = input.checksum?.trim().toLowerCase() ?? '';
  const sessionKey = input.sessionKey?.trim() ?? '';
  if (!APP_ID.test(appId)) return 'el identificador de la app no es válido';
  if (!CHANNEL.test(channel)) return 'el canal no es válido';
  if (!VERSION.test(version)) return 'la versión no es válida';
  if (!NATIVE_VERSION.test(minNativeVersion))
    return 'la versión nativa mínima no es válida (p. ej. 1.2.0)';
  // RSA-2048: 256 bytes firmados = 512 caracteres hex.
  if (!HEX.test(checksum) || checksum.length !== 512)
    return 'falta el checksum firmado (¿se subió sin cifrar?)';
  const [iv, key, ...rest] = sessionKey.split(':');
  if (rest.length || !iv || !key || !B64.test(iv) || !B64.test(key))
    return 'falta la clave de sesión (iv:clave)';
  if (Buffer.from(iv, 'base64').length !== 16)
    return 'el IV de la clave de sesión debe ser de 16 bytes';
  if (!(input.sizeBytes > 0)) return 'el zip está vacío';
  if (input.sizeBytes > MAX_BUNDLE_BYTES) return 'el zip es demasiado grande';
  return {
    appId,
    channel,
    version,
    minNativeVersion,
    checksum,
    sessionKey,
    sizeBytes: input.sizeBytes,
    notes: input.notes?.trim().slice(0, 500) || null,
  };
}

/** Estado de cada subida para el backoffice. */
export type BundleState = 'SERVING' | 'AVAILABLE' | 'DISABLED' | 'PURGED';

export function bundleStates<T extends Servable & Pick<OtaBundle, 'id'>>(
  bundles: T[],
): Map<string, BundleState> {
  const serving = pickBundle(bundles, null);
  return new Map(
    bundles.map((b) => [
      b.id,
      b.purgedAt
        ? 'PURGED'
        : !b.isEnabled
          ? 'DISABLED'
          : b.id === serving?.id
            ? 'SERVING'
            : 'AVAILABLE',
    ]),
  );
}
