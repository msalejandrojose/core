import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import {
  STORAGE_PORT,
  type StoragePort,
} from '../../../storage/application/ports/storage.port';
import type { OtaBundle } from '../../domain/entities/ota-bundle.entity';
import {
  DuplicatedOtaBundleError,
  InvalidOtaBundleError,
  OtaBundleNotFoundError,
} from '../../domain/errors/ota.errors';
import {
  DEFAULT_CHANNEL,
  DEFAULT_KEEP_BUNDLES,
  bundleStates,
  bundlesToPurge,
  cleanPublish,
  pickBundle,
  type BundleState,
  type PublishInput,
} from '../../domain/services/ota';
import {
  OTA_BUNDLE_REPOSITORY,
  type OtaBundleRepositoryPort,
} from '../ports/ota-bundle-repository.port';

/** Lo que manda el plugin (`@capgo/capacitor-updater`) al preguntar si hay actualización. */
export interface UpdateCheck {
  appId: string;
  /** Versión de la web que tiene ahora («builtin» = la que vino con la app). */
  versionName: string;
  /** Versión nativa de la app instalada (la de la tienda). */
  versionBuild: string | null;
  channel: string | null;
}

/** Respuesta en el formato que entiende el plugin. */
export type UpdateAnswer =
  | { version: string; url: string; session_key: string; checksum: string }
  | { kind: 'up_to_date'; error: 'no_new_version_available'; message: string };

/** Validez de la URL firmada de descarga (el plugin baja el zip en el momento). */
const DOWNLOAD_URL_TTL = 60 * 60;

export interface BundleView extends OtaBundle {
  state: BundleState;
}

@Injectable()
export class OtaUseCases {
  private readonly logger = new Logger(OtaUseCases.name);

  constructor(
    @Inject(OTA_BUNDLE_REPOSITORY)
    private readonly repo: OtaBundleRepositoryPort,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    private readonly config: ConfigService,
  ) {}

  /** Zips que se guardan por app y canal (`OTA_KEEP_BUNDLES`, 5 por defecto). */
  get keep(): number {
    const n = Number(this.config.get<string>('OTA_KEEP_BUNDLES'));
    return Number.isInteger(n) && n >= 1 ? n : DEFAULT_KEEP_BUNDLES;
  }

  async check(q: UpdateCheck): Promise<UpdateAnswer> {
    const upToDate = (message: string): UpdateAnswer => ({
      kind: 'up_to_date',
      error: 'no_new_version_available',
      message,
    });
    if (!q.appId) return upToDate('Sin app');
    const bundles = await this.repo.list(
      q.appId,
      q.channel?.trim() || DEFAULT_CHANNEL,
    );
    const bundle = pickBundle(bundles, q.versionBuild);
    if (!bundle) return upToDate('No hay actualizaciones para esta app');
    if (bundle.version === q.versionName)
      return upToDate('Ya tienes la última versión');
    return {
      version: bundle.version,
      url: await this.downloadUrl(bundle.storageKey),
      session_key: bundle.sessionKey,
      checksum: bundle.checksum,
    };
  }

  async list(appId: string | null, channel: string | null) {
    const apps = await this.repo.apps();
    const app = appId ?? apps[0]?.appId ?? null;
    const ch = channel?.trim() || DEFAULT_CHANNEL;
    const bundles = app ? await this.repo.list(app, ch) : [];
    const states = bundleStates(bundles);
    return {
      apps,
      appId: app,
      channel: ch,
      keep: this.keep,
      bundles: bundles.map(
        (b): BundleView => ({ ...b, state: states.get(b.id) ?? 'AVAILABLE' }),
      ),
    };
  }

  /** Guarda el zip (ya cifrado por el script) en el storage y lo deja activo. */
  async publish(
    input: Omit<PublishInput, 'sizeBytes'>,
    zip: Buffer,
    userId: string | null,
  ): Promise<OtaBundle> {
    const clean = cleanPublish({ ...input, sizeBytes: zip.length });
    if (typeof clean === 'string') throw new InvalidOtaBundleError(clean);
    if (await this.repo.exists(clean.appId, clean.channel, clean.version))
      throw new DuplicatedOtaBundleError(clean.appId, clean.version);
    const storageKey = `ota/${clean.appId}/${clean.channel}/${clean.version}-${randomUUID().slice(0, 8)}.zip`;
    await this.storage.put({
      key: storageKey,
      body: zip,
      contentType: 'application/zip',
    });
    const bundle = await this.repo.create({
      ...clean,
      storageKey,
      createdById: userId,
    });
    // Cada subida limpia las viejas: así el storage no crece sin fin.
    await this.purge(clean.appId, clean.channel).catch((e: unknown) =>
      this.logger.warn(`No se pudieron borrar zips viejos: ${String(e)}`),
    );
    return bundle;
  }

  async setEnabled(id: string, isEnabled: boolean): Promise<OtaBundle> {
    const current = await this.repo.find(id);
    if (!current || current.purgedAt) throw new OtaBundleNotFoundError(id);
    const updated = await this.repo.setEnabled(id, isEnabled);
    if (!updated) throw new OtaBundleNotFoundError(id);
    return updated;
  }

  /** Borra el zip del storage ya; la fila se queda como historial. */
  async remove(id: string): Promise<void> {
    const b = await this.repo.find(id);
    if (!b) throw new OtaBundleNotFoundError(id);
    if (b.purgedAt) return;
    await this.deleteObject(b);
  }

  /**
   * Borra del storage los zips que sobran de una app y canal (o de todas):
   * se quedan los `keep` más recientes y los que todavía se sirven.
   */
  async purge(appId?: string, channel?: string): Promise<number> {
    const targets = appId
      ? [{ appId, channel: channel || DEFAULT_CHANNEL }]
      : await this.repo.apps();
    let removed = 0;
    for (const t of targets) {
      const bundles = await this.repo.list(t.appId, t.channel);
      for (const b of bundlesToPurge(bundles, this.keep)) {
        await this.deleteObject(b);
        removed += 1;
      }
    }
    return removed;
  }

  private async deleteObject(b: OtaBundle) {
    await this.storage.delete(b.storageKey).catch((e: unknown) => {
      // Si ya no estaba, también vale: lo importante es que no ocupe.
      this.logger.warn(`Borrando ${b.storageKey}: ${String(e)}`);
    });
    await this.repo.markPurged(b.id, new Date());
  }

  /** URL absoluta de descarga (con el driver LOCAL, la del propio API). */
  private async downloadUrl(key: string): Promise<string> {
    const url = await this.storage.getSignedUrl(key, DOWNLOAD_URL_TTL);
    if (/^https?:\/\//.test(url)) return url;
    const base = (this.config.get<string>('APP_URL') ?? '').replace(/\/+$/, '');
    return `${base}/v1${url}`;
  }
}
