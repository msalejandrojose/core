import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { SectionAccessType } from '../../../domain/entities/section.entity';

export class SetSectionAccessDto {
  @ApiProperty({ enum: ['GRANT', 'DENY'] })
  @IsEnum(['GRANT', 'DENY'] as SectionAccessType[])
  access!: SectionAccessType;
}
