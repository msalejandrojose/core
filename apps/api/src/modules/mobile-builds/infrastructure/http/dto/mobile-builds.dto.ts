import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type {
  BuildDetailView,
  BuildListView,
  BuildView,
} from '../../../application/use-cases/mobile-builds.use-cases';
import { BUILD_PLATFORMS, BUILD_PROFILES } from '../../../domain/mobile-build';

export class LaunchMobileBuildDto {
  @ApiProperty({ enum: BUILD_PLATFORMS, example: 'ios' })
  @IsIn(BUILD_PLATFORMS)
  platform!: (typeof BUILD_PLATFORMS)[number];

  @ApiProperty({ enum: BUILD_PROFILES, example: 'device' })
  @IsIn(BUILD_PROFILES)
  profile!: (typeof BUILD_PROFILES)[number];

  @ApiPropertyOptional({
    example: 'iPhone de Alejandro Jose',
    description:
      'iOS: nombre o id de `fastlane ios devices`; Android: ip:puerto de adb. Vacío = el único emparejado.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  device?: string;

  @ApiPropertyOptional({ description: 'Vacío = minutos desde el 1-1-2026.' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  buildNumber?: number;

  @ApiPropertyOptional({
    example: 'brio-dev',
    description: 'Rama a compilar (por defecto la de GITHUB_BUILDS_REF).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  ref?: string;
}

export class MobileBuildRunnerDto {
  @ApiProperty() name!: string;
  @ApiProperty() online!: boolean;
  @ApiProperty() busy!: boolean;
}

export class MobileBuildSignatureDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    description:
      'Caducidad del perfil de firma (cuenta gratuita: 7 días desde que Xcode lo crea).',
  })
  expiresAt!: Date;
  @ApiProperty({ description: 'El build que la dejó apuntada.' })
  buildId!: number;
}

export class MobileBuildArtifactDto {
  @ApiProperty() id!: number;
  @ApiProperty() name!: string;
  @ApiProperty() sizeBytes!: number;
  @ApiProperty() expired!: boolean;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  expiresAt!: Date | null;
}

export class MobileBuildDto {
  @ApiProperty() id!: number;
  @ApiProperty({
    enum: ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED'],
  })
  state!: BuildView['state'];
  @ApiProperty({ enum: BUILD_PLATFORMS, nullable: true })
  platform!: BuildView['platform'];
  @ApiProperty({ enum: BUILD_PROFILES, nullable: true })
  profile!: BuildView['profile'];
  @ApiProperty({ type: String, nullable: true }) device!: string | null;
  @ApiProperty() ref!: string;
  @ApiProperty({ description: 'El run en GitHub Actions.' }) url!: string;
  @ApiProperty({ type: String, nullable: true }) launchedBy!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: Date;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  startedAt!: Date | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  finishedAt!: Date | null;
  @ApiProperty({ type: Number, nullable: true }) durationSeconds!:
    | number
    | null;

  static from(b: BuildView): MobileBuildDto {
    return {
      id: b.id,
      state: b.state,
      platform: b.platform,
      profile: b.profile,
      device: b.device,
      ref: b.ref,
      url: b.url,
      launchedBy: b.launchedBy,
      createdAt: b.createdAt,
      startedAt: b.startedAt,
      finishedAt: b.finishedAt,
      durationSeconds: b.durationSeconds,
    };
  }
}

export class MobileBuildDetailDto extends MobileBuildDto {
  @ApiProperty({ type: [MobileBuildArtifactDto] })
  artifacts!: MobileBuildArtifactDto[];

  static fromDetail(b: BuildDetailView): MobileBuildDetailDto {
    return { ...MobileBuildDto.from(b), artifacts: b.artifacts };
  }
}

export class MobileBuildListDto {
  @ApiProperty({ description: 'false = falta GITHUB_BUILDS_TOKEN en la API.' })
  configured!: boolean;
  @ApiProperty({ example: 'brio-dev' }) defaultRef!: string;
  @ApiProperty({
    type: MobileBuildRunnerDto,
    nullable: true,
    description: 'El Mac; null si el token no puede verlo.',
  })
  runner!: MobileBuildRunnerDto | null;
  @ApiProperty({
    type: MobileBuildSignatureDto,
    nullable: true,
    description:
      'Hasta cuándo vale la firma de la app del iPhone; null si el último build no la apuntó.',
  })
  signature!: MobileBuildSignatureDto | null;
  @ApiProperty({ type: [MobileBuildDto] }) builds!: MobileBuildDto[];

  static from(l: BuildListView): MobileBuildListDto {
    return { ...l, builds: l.builds.map((b) => MobileBuildDto.from(b)) };
  }
}

export class MobileBuildArtifactUrlDto {
  @ApiProperty({ description: 'URL firmada de GitHub; caduca en un minuto.' })
  url!: string;
}
