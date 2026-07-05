import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class SetTagsDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de las etiquetas a asignar.',
  })
  @IsArray()
  @IsUUID('all', { each: true })
  tagIds: string[];
}
