import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

// Body de PATCH /users/:id. Todos los campos opcionales y solo los enviados
// se aplican (la persistence pasa los `undefined` directamente y Prisma los
// ignora).
//
// NO se permiten: email (necesita re-verificación), userType (semántico),
// password (flujo aparte con verificación de la actual).
export class UpdateUserDto {
  // `null` está permitido explícitamente para "borrar" el nombre.
  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(100)
  firstName?: string | null;

  @ApiPropertyOptional({ maxLength: 100, nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  @MaxLength(100)
  lastName?: string | null;

  @ApiPropertyOptional({ description: 'Reactivar/desactivar el usuario.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
