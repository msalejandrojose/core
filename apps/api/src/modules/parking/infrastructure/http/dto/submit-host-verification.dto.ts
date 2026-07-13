import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

/** Body de `POST /me/host-verification`. El documento ya debe existir (`storage`, `status: READY`). */
export class SubmitHostVerificationDto {
  @ApiProperty() @IsString() @MaxLength(200) legalName: string;
  @ApiProperty() @IsUUID() documentFileId: string;
}
