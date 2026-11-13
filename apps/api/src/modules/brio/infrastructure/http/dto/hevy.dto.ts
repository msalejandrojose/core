import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DAY_PATTERN } from './day.param';

export class ConnectHevyDto {
  @ApiProperty({
    description:
      'Clave de la API de Hevy (Ajustes → Developer, cuentas Pro). Se guarda cifrada y no se devuelve.',
  })
  @IsString()
  @MinLength(12)
  @MaxLength(200)
  apiKey!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Importar los entrenos nada más conectar.',
  })
  @IsOptional()
  @IsBoolean()
  importNow?: boolean;
}

export class SendRoutineDto {
  @ApiProperty({
    example: '2026-11-14',
    description: 'Día de la sesión de fuerza planificada.',
  })
  @Matches(DAY_PATTERN, { message: 'day debe tener formato YYYY-MM-DD.' })
  day!: string;
}
