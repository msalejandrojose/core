import { DomainError } from '../../../../shared/errors/domain-error';

export class ParkingPhotoNotFoundError extends DomainError {
  constructor(id: string) {
    super('PARKING_PHOTO_NOT_FOUND', `Foto ${id} no encontrada en la plaza.`, {
      id,
    });
  }
}
