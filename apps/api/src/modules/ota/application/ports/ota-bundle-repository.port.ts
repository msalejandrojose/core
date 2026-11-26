import type { OtaBundle } from '../../domain/entities/ota-bundle.entity';
import type { CleanPublish } from '../../domain/services/ota';

export const OTA_BUNDLE_REPOSITORY = Symbol('OTA_BUNDLE_REPOSITORY');

export interface OtaBundleRepositoryPort {
  /** Todas las subidas de una app y canal (incluidas las ya borradas del storage). */
  list(appId: string, channel: string): Promise<OtaBundle[]>;
  /** Apps y canales con alguna subida. */
  apps(): Promise<{ appId: string; channel: string }[]>;
  find(id: string): Promise<OtaBundle | null>;
  exists(appId: string, channel: string, version: string): Promise<boolean>;
  create(
    data: CleanPublish & { storageKey: string; createdById: string | null },
  ): Promise<OtaBundle>;
  setEnabled(id: string, isEnabled: boolean): Promise<OtaBundle | null>;
  markPurged(id: string, at: Date): Promise<void>;
}
