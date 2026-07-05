import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ConvertLeadDto {
  @ApiProperty({ description: 'ID del User creado a partir del lead.' })
  @IsUUID()
  userId: string;
}
