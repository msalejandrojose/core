import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type FieldOption,
  type FieldOptionsResult,
} from '../../../application/ports/field-options-repository.port';

export class FieldOptionDto {
  @ApiProperty()
  value: string;

  @ApiProperty()
  label: string;

  @ApiPropertyOptional({ nullable: true })
  parentValue?: string | null;

  @ApiPropertyOptional()
  disabled?: boolean;

  static from(o: FieldOption): FieldOptionDto {
    const dto = new FieldOptionDto();
    dto.value = o.value;
    dto.label = o.label;
    dto.parentValue = o.parentValue ?? null;
    dto.disabled = o.disabled;
    return dto;
  }
}

export class FieldOptionsResultDto {
  @ApiProperty({ type: [FieldOptionDto] })
  options: FieldOptionDto[];

  @ApiPropertyOptional({ description: 'Total sin paginar, si se conoce.' })
  total?: number;

  static from(result: FieldOptionsResult): FieldOptionsResultDto {
    const dto = new FieldOptionsResultDto();
    dto.options = result.options.map((o) => FieldOptionDto.from(o));
    dto.total = result.total;
    return dto;
  }
}

export class FieldOptionsEntitiesDto {
  @ApiProperty({ type: [String], description: 'Entidades con repositorio.' })
  entities: string[];
}
