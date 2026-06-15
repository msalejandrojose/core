import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestResetDto {
  @ApiProperty({ description: 'Email de la cuenta para la que se solicita el reset.' })
  @IsEmail()
  email!: string;
}
