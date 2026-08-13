import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, ValidateIf } from 'class-validator';

// Ausente (undefined) en un hueco de pieza = no lo toques. `null` = vacíalo.
// `archetypeId` es siempre obligatorio: equipar manda la configuración
// completa que se quiere, no un parche.
export class SetPlayerCarLoadoutDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  archetypeId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  tiresPartId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  wingPartId?: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsUUID()
  chassisPartId?: string | null;
}
