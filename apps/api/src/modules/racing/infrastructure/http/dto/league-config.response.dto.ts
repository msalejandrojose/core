import { ApiProperty } from '@nestjs/swagger';
import {
  RacingLeagueConfig,
  RacingLeagueConfigKey,
} from '../../../domain/entities/racing-league-config.entity';

export class LeagueConfigResponseDto {
  @ApiProperty({ enum: RacingLeagueConfigKey }) key!: RacingLeagueConfigKey;
  @ApiProperty({ example: 10 }) value!: number;

  static fromDomain(config: RacingLeagueConfig): LeagueConfigResponseDto {
    const dto = new LeagueConfigResponseDto();
    dto.key = config.key;
    dto.value = config.value;
    return dto;
  }
}

export class LeagueConfigListResponseDto {
  @ApiProperty({ type: [LeagueConfigResponseDto] })
  items!: LeagueConfigResponseDto[];

  static fromDomain(
    configs: RacingLeagueConfig[],
  ): LeagueConfigListResponseDto {
    const dto = new LeagueConfigListResponseDto();
    dto.items = configs.map((c) => LeagueConfigResponseDto.fromDomain(c));
    return dto;
  }
}
