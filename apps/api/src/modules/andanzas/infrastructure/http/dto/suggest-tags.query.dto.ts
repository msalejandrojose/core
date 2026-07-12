import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SuggestTagsQueryDto {
  @ApiProperty({ minLength: 1, maxLength: 60, example: 'pla' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  q!: string;
}
