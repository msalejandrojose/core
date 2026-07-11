import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class FacebookLoginDto {
  @ApiProperty({
    description: 'Access token devuelto por el SDK nativo de Facebook Login.',
  })
  @IsString()
  @MaxLength(4096)
  accessToken!: string;
}
