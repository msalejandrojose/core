import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateCountryDto {
  @ApiProperty({
    description: 'ISO 3166-1 alpha-2.',
    example: 'ES',
    minLength: 2,
    maxLength: 2,
  })
  @IsString()
  @Length(2, 2)
  iso2: string;

  @ApiProperty({
    description: 'ISO 3166-1 alpha-3.',
    example: 'ESP',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3)
  iso3: string;

  @ApiPropertyOptional({
    description: 'ISO 3166-1 numeric.',
    example: '724',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  numericCode?: string;

  @ApiProperty({ maxLength: 120, example: 'España' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ maxLength: 120, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  nativeName?: string;

  @ApiPropertyOptional({
    description: 'Prefijo telefónico.',
    example: '+34',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  phoneCode?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
