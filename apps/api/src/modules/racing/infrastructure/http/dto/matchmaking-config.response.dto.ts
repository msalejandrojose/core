import { ApiProperty } from '@nestjs/swagger';
import {
  RacingMatchmakingConfig,
  RacingMatchmakingConfigKey,
} from '../../../domain/entities/racing-matchmaking-config.entity';

export class MatchmakingConfigResponseDto {
  @ApiProperty({ enum: RacingMatchmakingConfigKey }) key!: RacingMatchmakingConfigKey;
  @ApiProperty({ example: 32 }) value!: number;

  static fromDomain(config: RacingMatchmakingConfig): MatchmakingConfigResponseDto {
    const dto = new MatchmakingConfigResponseDto();
    dto.key = config.key;
    dto.value = config.value;
    return dto;
  }
}

export class MatchmakingConfigListResponseDto {
  @ApiProperty({ type: [MatchmakingConfigResponseDto] })
  items!: MatchmakingConfigResponseDto[];

  static fromDomain(
    configs: RacingMatchmakingConfig[],
  ): MatchmakingConfigListResponseDto {
    const dto = new MatchmakingConfigListResponseDto();
    dto.items = configs.map((c) => MatchmakingConfigResponseDto.fromDomain(c));
    return dto;
  }
}
