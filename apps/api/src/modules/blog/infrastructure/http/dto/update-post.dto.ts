import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// Todos los campos son opcionales. `null` en `categoryId`/`coverImageId` los
// limpia; un array (incluso vacío) en `tagIds` reemplaza el set de etiquetas.
export class UpdatePostDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ maxLength: 180 })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  slug?: string;

  @ApiPropertyOptional({ type: String, maxLength: 320, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(320)
  excerpt?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  coverImageId?: string | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ type: String, maxLength: 200, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(200)
  metaTitle?: string | null;

  @ApiPropertyOptional({ type: String, maxLength: 320, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(320)
  metaDescription?: string | null;
}
