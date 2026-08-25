import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GoogleAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code devuelto por Google.' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({
    description: 'Valor anti-CSRF generado al iniciar la sesión.',
  })
  @IsString()
  @IsNotEmpty()
  state!: string;

  // Google añade estos parámetros a la redirección además de `code`/`state`
  // (varían según el flujo — `iss`, el scope real concedido, la cuenta
  // elegida si hay varias logueadas, si hubo que reconfirmar consentimiento).
  // No se usan para nada — solo hace falta declararlos para que el
  // `forbidNonWhitelisted` global no rechace la petición por traer campos
  // que el DTO no esperaba.
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  iss?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authuser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prompt?: string;
}
