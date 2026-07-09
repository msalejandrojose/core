import { Device, DevicePlatform } from '../../domain/entities/device.entity';

export const DEVICE_REPOSITORY = Symbol('DEVICE_REPOSITORY');

export interface UpsertDeviceData {
  userId: string;
  token: string;
  platform: DevicePlatform;
}

export interface DeviceRepositoryPort {
  /**
   * Registra (o refresca) el token de un dispositivo. Idempotente por `token`:
   * si ya existe, actualiza `userId`/`platform` y `lastSeenAt`; si no, lo crea.
   */
  upsert(data: UpsertDeviceData): Promise<Device>;
  /**
   * Da de baja un token del usuario. Devuelve `true` si borró algo, `false` si
   * el token no existía o no pertenecía al usuario (baja idempotente).
   */
  deleteByToken(userId: string, token: string): Promise<boolean>;
  /** Todos los tokens activos de un usuario (para dirigir un push). */
  listTokensByUser(userId: string): Promise<string[]>;
}
