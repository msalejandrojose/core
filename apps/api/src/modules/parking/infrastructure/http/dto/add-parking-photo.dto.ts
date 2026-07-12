import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Body de `POST /me/parkings/:id/photos`. El archivo ya debe existir (`storage`, `status: READY`). */
export class AddParkingPhotoDto {
  @ApiProperty() @IsUUID() storedFileId: string;
}
