import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'ID token devuelto por el SDK nativo de Google Sign-In.',
  })
  @IsString()
  @MaxLength(4096)
  idToken!: string;
}
