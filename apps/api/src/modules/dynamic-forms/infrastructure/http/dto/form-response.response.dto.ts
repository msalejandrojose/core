import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormResponse } from '../../../domain/entities/form-response.entity';

export class FormResponseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() formInstanceId: string;
  @ApiPropertyOptional({ nullable: true }) submittedById: string | null;
  @ApiProperty() answers: unknown;
  @ApiProperty() submittedAt: Date;
  @ApiPropertyOptional({ nullable: true }) ipAddress: string | null;

  static fromDomain(response: FormResponse): FormResponseResponseDto {
    const dto = new FormResponseResponseDto();
    dto.id = response.id;
    dto.formInstanceId = response.formInstanceId;
    dto.submittedById = response.submittedById;
    dto.answers = response.answers;
    dto.submittedAt = response.submittedAt;
    dto.ipAddress = response.ipAddress;
    return dto;
  }
}
