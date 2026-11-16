import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AppleLoginDto {
  @ApiProperty({
    description: 'Identity token (JWT) devuelto por Sign in with Apple.',
  })
  @IsString()
  @MaxLength(8192)
  identityToken!: string;

  @ApiPropertyOptional({
    description: 'Nombre que Apple da solo la primera vez que se autoriza.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
