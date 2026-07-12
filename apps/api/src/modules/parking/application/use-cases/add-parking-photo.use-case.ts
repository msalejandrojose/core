import { Inject, Injectable } from '@nestjs/common';
import {
  STORED_FILE_REPOSITORY,
  type StoredFileRepositoryPort,
} from '../../../storage/application/ports/stored-file-repository.port';
import { Parking } from '../../domain/entities/parking.entity';
import { ParkingNotFoundError } from '../../domain/errors/parking-not-found.error';
import { ParkingPhotoSourceInvalidError } from '../../domain/errors/parking-photo-source-invalid.error';
import {
  PARKING_REPOSITORY,
  type ParkingRepositoryPort,
} from '../ports/parking-repository.port';

/**
 * Adjunta como foto un `StoredFile` ya subido (el cliente lo sube antes vía
 * el módulo `storage`, típicamente `POST /files`). Solo se acepta un archivo
 * `READY` y propiedad del propio host — evita que un host adjunte el archivo
 * de otro usuario a su plaza.
 */
@Injectable()
export class AddParkingPhotoUseCase {
  constructor(
    @Inject(PARKING_REPOSITORY)
    private readonly parkings: ParkingRepositoryPort,
    @Inject(STORED_FILE_REPOSITORY)
    private readonly storedFiles: StoredFileRepositoryPort,
  ) {}

  async execute(
    parkingId: string,
    hostUserId: string,
    storedFileId: string,
  ): Promise<Parking> {
    const parking = await this.parkings.findByIdForHost(parkingId, hostUserId);
    if (!parking) throw new ParkingNotFoundError(parkingId);

    const file = await this.storedFiles.findById(storedFileId);
    if (!file || file.status !== 'READY' || file.ownerUserId !== hostUserId) {
      throw new ParkingPhotoSourceInvalidError(storedFileId);
    }

    return this.parkings.addPhoto(parkingId, storedFileId);
  }
}
