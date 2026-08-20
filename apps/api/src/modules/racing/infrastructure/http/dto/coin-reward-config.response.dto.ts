import { ApiProperty } from '@nestjs/swagger';
import { RacingCoinRewardConfig, RacingCoinRewardKey } from '../../../domain/entities/racing-coin-reward-config.entity';

export class CoinRewardConfigResponseDto {
  @ApiProperty({ enum: RacingCoinRewardKey }) key!: RacingCoinRewardKey;
  @ApiProperty({ example: 100 }) amount!: number;

  static fromDomain(config: RacingCoinRewardConfig): CoinRewardConfigResponseDto {
    const dto = new CoinRewardConfigResponseDto();
    dto.key = config.key;
    dto.amount = config.amount;
    return dto;
  }
}

export class CoinRewardConfigListResponseDto {
  @ApiProperty({ type: [CoinRewardConfigResponseDto] })
  items!: CoinRewardConfigResponseDto[];

  static fromDomain(
    configs: RacingCoinRewardConfig[],
  ): CoinRewardConfigListResponseDto {
    const dto = new CoinRewardConfigListResponseDto();
    dto.items = configs.map((c) => CoinRewardConfigResponseDto.fromDomain(c));
    return dto;
  }
}
