import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export class GameCenterLoginDto {
  @ApiProperty({ description: 'playerId devuelto por el plugin gamecenter.' })
  @IsString()
  @MaxLength(255)
  playerId!: string;

  @ApiProperty({
    description: 'bundleId de la app — se valida contra GAME_CENTER_BUNDLE_ID.',
  })
  @IsString()
  @MaxLength(255)
  bundleId!: string;

  @ApiProperty({ description: 'Milisegundos desde epoch, tal cual lo da el SDK de Apple.' })
  @IsInt()
  @Min(0)
  timestamp!: number;

  @ApiProperty({ description: 'Firma en base64.' })
  @IsString()
  @MaxLength(4096)
  signature!: string;

  @ApiProperty({ description: 'Salt en base64.' })
  @IsString()
  @MaxLength(4096)
  salt!: string;

  @ApiProperty({
    description: 'URL del certificado público de Apple — se valida que sea de apple.com.',
  })
  @IsUrl()
  @MaxLength(1024)
  publicKeyUrl!: string;
}
