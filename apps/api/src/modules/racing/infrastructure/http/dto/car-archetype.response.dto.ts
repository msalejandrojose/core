import { ApiProperty } from '@nestjs/swagger';
import { CarArchetype } from '../../../domain/entities/car-archetype.entity';

export class CarArchetypeResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'normal' }) code!: string;
  @ApiProperty({ example: 'Normal' }) name!: string;
  @ApiProperty({ example: 1.0 }) speedScale!: number;
  @ApiProperty({ example: 1.0 }) grip!: number;
  @ApiProperty({
    example: 1.0,
    description:
      'Multiplica el grip efectivo cuando la superficie no es asfalto seco.',
  })
  offroadGripModifier!: number;
  @ApiProperty() isUnlockedByDefault!: boolean;
  @ApiProperty({ nullable: true, description: 'null = no está a la venta.' })
  priceCoins!: number | null;
  @ApiProperty() isActive!: boolean;

  static fromDomain(archetype: CarArchetype): CarArchetypeResponseDto {
    const dto = new CarArchetypeResponseDto();
    dto.id = archetype.id;
    dto.code = archetype.code;
    dto.name = archetype.name;
    dto.speedScale = archetype.speedScale;
    dto.grip = archetype.grip;
    dto.offroadGripModifier = archetype.offroadGripModifier;
    dto.isUnlockedByDefault = archetype.isUnlockedByDefault;
    dto.priceCoins = archetype.priceCoins;
    dto.isActive = archetype.isActive;
    return dto;
  }
}
