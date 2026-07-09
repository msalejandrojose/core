import { Inject, Injectable } from '@nestjs/common';
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
} from '../ports/device-repository.port';

// Baja del token de push del usuario (típicamente al hacer logout/unregister en
// la app). Idempotente: si el token no existe o es de otro usuario, no falla —
// simplemente devuelve `false`.
@Injectable()
export class UnregisterDeviceUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY)
    private readonly repo: DeviceRepositoryPort,
  ) {}

  execute(userId: string, token: string): Promise<boolean> {
    return this.repo.deleteByToken(userId, token);
  }
}
