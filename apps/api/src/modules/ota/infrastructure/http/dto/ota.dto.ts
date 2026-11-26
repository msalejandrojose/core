import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import type { BundleView } from '../../../application/use-cases/ota.use-cases';

/** Campos del formulario multipart con el que el script sube un zip. */
export class PublishOtaBundleDto {
  @ApiProperty({ example: 'es.aj.brio' })
  @IsString()
  @MaxLength(120)
  appId!: string;
  @ApiPropertyOptional({ example: 'production' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  channel?: string;
  @ApiProperty({ example: '1.0.0-202611261030' })
  @IsString()
  @MaxLength(60)
  version!: string;
  @ApiProperty({
    example: '1.0.0',
    description: 'Versión nativa mínima (la de la tienda) que necesita.',
  })
  @IsString()
  @MaxLength(40)
  minNativeVersion!: string;
  @ApiProperty({
    description: 'SHA-256 del zip, firmado con la clave privada (hex).',
  })
  @IsString()
  @MaxLength(1100)
  checksum!: string;
  @ApiProperty({ description: '«iv:clave» en base64, la clave firmada.' })
  @IsString()
  @MaxLength(1100)
  sessionKey!: string;
  @ApiPropertyOptional({ example: 'Arregla el registro de entrenos' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class SetOtaBundleEnabledDto {
  @ApiProperty() @IsBoolean() isEnabled!: boolean;
}

export class ListOtaBundlesQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() appId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
}

export class OtaPurgeQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() appId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() channel?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  all?: boolean;
}

export class OtaBundleDto {
  @ApiProperty() id!: string;
  @ApiProperty() appId!: string;
  @ApiProperty() channel!: string;
  @ApiProperty() version!: string;
  @ApiProperty() minNativeVersion!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty({ type: String, nullable: true }) notes!: string | null;
  @ApiProperty() isEnabled!: boolean;
  @ApiProperty({
    enum: ['SERVING', 'AVAILABLE', 'DISABLED', 'PURGED'],
    description:
      'SERVING = la que se bajan ahora las apps al día; PURGED = zip ya borrado del storage.',
  })
  state!: BundleView['state'];
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  purgedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;

  static from(b: Omit<BundleView, 'state'> & { state?: BundleView['state'] }) {
    const dto = new OtaBundleDto();
    dto.id = b.id;
    dto.appId = b.appId;
    dto.channel = b.channel;
    dto.version = b.version;
    dto.minNativeVersion = b.minNativeVersion;
    dto.sizeBytes = b.sizeBytes;
    dto.notes = b.notes;
    dto.isEnabled = b.isEnabled;
    dto.state =
      b.state ??
      (b.purgedAt ? 'PURGED' : b.isEnabled ? 'AVAILABLE' : 'DISABLED');
    dto.purgedAt = b.purgedAt;
    dto.createdAt = b.createdAt;
    return dto;
  }
}

export class OtaAppDto {
  @ApiProperty() appId!: string;
  @ApiProperty() channel!: string;
}

export class OtaBundleListDto {
  @ApiProperty({ type: [OtaAppDto] }) apps!: OtaAppDto[];
  @ApiProperty({ type: String, nullable: true }) appId!: string | null;
  @ApiProperty() channel!: string;
  @ApiProperty({ description: 'Zips que se guardan por app y canal.' })
  keep!: number;
  @ApiProperty({ type: [OtaBundleDto] }) bundles!: OtaBundleDto[];
}

export class OtaPurgeResultDto {
  @ApiProperty({ description: 'Zips borrados del storage.' }) removed!: number;
}
