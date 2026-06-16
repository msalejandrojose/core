import { ApiProperty } from '@nestjs/swagger';
import { StoredFile } from '../../../domain/entities/stored-file.entity';

export class StoredFileResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ nullable: true }) ownerUserId: string | null;
  @ApiProperty() originalName: string;
  @ApiProperty() mimeType: string;
  @ApiProperty() sizeBytes: number;
  @ApiProperty() driver: string;
  @ApiProperty() status: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(file: StoredFile): StoredFileResponseDto {
    const dto = new StoredFileResponseDto();
    dto.id = file.id;
    dto.ownerUserId = file.ownerUserId;
    dto.originalName = file.originalName;
    dto.mimeType = file.mimeType;
    dto.sizeBytes = file.sizeBytes;
    dto.driver = file.driver;
    dto.status = file.status;
    dto.createdAt = file.createdAt;
    dto.updatedAt = file.updatedAt;
    return dto;
  }
}
