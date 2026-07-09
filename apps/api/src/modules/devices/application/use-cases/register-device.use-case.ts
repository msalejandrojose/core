import { Inject, Injectable } from '@nestjs/common';
import { Device } from '../../domain/entities/device.entity';
import {
  DEVICE_REPOSITORY,
  type DeviceRepositoryPort,
  type UpsertDeviceData,
} from '../ports/device-repository.port';

// Alta/refresco del token de push del usuario autenticado. La app mobile la
// llama en cada arranque (best-effort) con el token que emite FCM; por eso es
// idempotente vía upsert sobre el `token`.
@Injectable()
export class RegisterDeviceUseCase {
  constructor(
    @Inject(DEVICE_REPOSITORY)
    private readonly repo: DeviceRepositoryPort,
  ) {}

  execute(input: UpsertDeviceData): Promise<Device> {
    return this.repo.upsert(input);
  }
}
