import { Device, DevicePlatform } from '../../domain/entities/device.entity';

export interface DeviceRow {
  id: string;
  userId: string;
  token: string;
  platform: string;
  createdAt: Date;
  lastSeenAt: Date;
}

export function toDeviceDomain(row: DeviceRow): Device {
  return {
    id: row.id,
    userId: row.userId,
    token: row.token,
    // La columna es VarChar; el DTO valida la entrada, así que en BBDD solo
    // caben valores válidos. El cast estrecha el tipo para el dominio.
    platform: row.platform as DevicePlatform,
    createdAt: row.createdAt,
    lastSeenAt: row.lastSeenAt,
  };
}
