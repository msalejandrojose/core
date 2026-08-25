import { ApiProperty } from '@nestjs/swagger';
import {
  CarPart,
  CarPartCategory,
} from '../../../domain/entities/car-part.entity';

export class CarPartResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'tires-grip' }) code!: string;
  @ApiProperty({ enum: CarPartCategory }) category!: CarPartCategory;
  @ApiProperty({ example: 'Neumáticos de agarre' }) name!: string;
  @ApiProperty({
    example: -0.05,
    description: 'Delta sobre el speedScale del arquetipo equipado.',
  })
  speedScale!: number;
  @ApiProperty({
    example: 0.1,
    description: 'Delta sobre el grip del arquetipo.',
  })
  grip!: number;
  @ApiProperty() isUnlockedByDefault!: boolean;
  @ApiProperty({ nullable: true, description: 'null = no está a la venta.' })
  priceCoins!: number | null;
  @ApiProperty() isActive!: boolean;

  static fromDomain(part: CarPart): CarPartResponseDto {
    const dto = new CarPartResponseDto();
    dto.id = part.id;
    dto.code = part.code;
    dto.category = part.category;
    dto.name = part.name;
    dto.speedScale = part.speedScale;
    dto.grip = part.grip;
    dto.isUnlockedByDefault = part.isUnlockedByDefault;
    dto.priceCoins = part.priceCoins;
    dto.isActive = part.isActive;
    return dto;
  }
}
