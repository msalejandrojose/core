import { ApiProperty } from '@nestjs/swagger';
import {
  RacingCircuitRotationConfig,
  RacingCircuitRotationConfigKey,
} from '../../../domain/entities/racing-circuit-rotation-config.entity';

export class CircuitRotationConfigResponseDto {
  @ApiProperty({ enum: RacingCircuitRotationConfigKey }) key!: RacingCircuitRotationConfigKey;
  @ApiProperty({ example: 2 }) value!: number;

  static fromDomain(
    config: RacingCircuitRotationConfig,
  ): CircuitRotationConfigResponseDto {
    const dto = new CircuitRotationConfigResponseDto();
    dto.key = config.key;
    dto.value = config.value;
    return dto;
  }
}

export class CircuitRotationConfigListResponseDto {
  @ApiProperty({ type: [CircuitRotationConfigResponseDto] })
  items!: CircuitRotationConfigResponseDto[];

  static fromDomain(
    configs: RacingCircuitRotationConfig[],
  ): CircuitRotationConfigListResponseDto {
    const dto = new CircuitRotationConfigListResponseDto();
    dto.items = configs.map((c) => CircuitRotationConfigResponseDto.fromDomain(c));
    return dto;
  }
}
