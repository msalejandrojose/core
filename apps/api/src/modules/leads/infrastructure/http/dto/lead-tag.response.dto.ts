import { ApiProperty } from '@nestjs/swagger';
import { type LeadTag } from '../../../domain/entities/lead-tag.entity';

export class LeadTagResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ type: String, nullable: true }) color: string | null;
  @ApiProperty() createdAt: Date;

  static fromDomain(tag: LeadTag): LeadTagResponseDto {
    const dto = new LeadTagResponseDto();
    dto.id = tag.id;
    dto.name = tag.name;
    dto.color = tag.color;
    dto.createdAt = tag.createdAt;
    return dto;
  }
}
