import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchSitePlacesQueryDto {
  @ApiProperty({ minLength: 2, maxLength: 200, example: 'chiringuito la ola' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  q!: string;
}
