import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { SectionScope } from '../../../domain/entities/section.entity';

export class CreateSectionDto {
  @ApiProperty({ description: 'Código único dentro del scope.' })
  @IsString()
  @MaxLength(255)
  code!: string;

  @ApiProperty({ description: 'Nombre o i18n key.' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: 'Nombre del icono de lucide-react.' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string | null;

  @ApiPropertyOptional({ description: 'Ruta de navegación.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  route?: string | null;

  @ApiPropertyOptional({ description: 'Id de la sección padre.' })
  @IsOptional()
  @IsUUID()
  parentId?: string | null;

  @ApiProperty({ enum: ['BACKOFFICE', 'APP', 'SHARED'] })
  @IsEnum(['BACKOFFICE', 'APP', 'SHARED'] as SectionScope[])
  scope!: SectionScope;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  apiRequirements?: string[];
}
