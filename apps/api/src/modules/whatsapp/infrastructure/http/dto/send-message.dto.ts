import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ description: 'Texto del mensaje a enviar.', maxLength: 4096 })
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  body!: string;
}
