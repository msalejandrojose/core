import { ApiProperty } from '@nestjs/swagger';
import { PostalCode } from '../../../domain/entities/postal-code.entity';

export class PostalCodeResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() code: string;
  @ApiProperty() municipalityId: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromDomain(pc: PostalCode): PostalCodeResponseDto {
    const dto = new PostalCodeResponseDto();
    dto.id = pc.id;
    dto.code = pc.code;
    dto.municipalityId = pc.municipalityId;
    dto.createdAt = pc.createdAt;
    dto.updatedAt = pc.updatedAt;
    return dto;
  }
}
