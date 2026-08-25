import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class PlayGamesLoginDto {
  @ApiProperty({
    description:
      'Server auth code devuelto por requestServerSideAccess() del SDK de Play Games Services v2.',
  })
  @IsString()
  @MaxLength(4096)
  serverAuthCode!: string;
}
