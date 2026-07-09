// Dispositivo push de un usuario (una fila de `device`). Entidad de dominio
// pura: sin Nest, sin Prisma. El `token` lo emite el proveedor de push (FCM) y
// es único a nivel global; `lastSeenAt` se refresca en cada re-registro.
export type DevicePlatform = 'ios' | 'android' | 'web';

export interface Device {
  id: string;
  userId: string;
  token: string;
  platform: DevicePlatform;
  createdAt: Date;
  lastSeenAt: Date;
}
