import { DomainError } from '../../../../shared/errors/domain-error';

/**
 * El `storedFileId` que se intenta adjuntar como foto no es utilizable: no
 * existe, no pertenece al host de la plaza, o su subida no ha terminado
 * (`status !== 'READY'`).
 */
export class ParkingPhotoSourceInvalidError extends DomainError {
  constructor(storedFileId: string) {
    super(
      'PARKING_PHOTO_SOURCE_INVALID',
      `El archivo ${storedFileId} no está disponible para usarse como foto de la plaza.`,
      { storedFileId },
    );
  }
}
