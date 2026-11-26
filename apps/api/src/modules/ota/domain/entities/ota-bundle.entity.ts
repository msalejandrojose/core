/** Una actualización en caliente subida para una app (ver `OtaBundle` en Prisma). */
export interface OtaBundle {
  id: string;
  appId: string;
  channel: string;
  version: string;
  minNativeVersion: string;
  storageKey: string;
  sizeBytes: number;
  checksum: string;
  sessionKey: string;
  notes: string | null;
  isEnabled: boolean;
  purgedAt: Date | null;
  createdById: string | null;
  createdAt: Date;
}
