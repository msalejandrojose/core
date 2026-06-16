import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateApiSectionDto {
  @ApiProperty({
    description: 'Code path-like, p.ej. `users` o `users.create`.',
    example: 'users',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  @Matches(/^[a-z0-9_]+(\.[a-z0-9_]+)*$/, {
    message: 'code debe ser segmentos lowercase separados por `.`',
  })
  code!: string;

  @ApiProperty({ example: 'Usuarios' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  parentSectionId?: string;
}
