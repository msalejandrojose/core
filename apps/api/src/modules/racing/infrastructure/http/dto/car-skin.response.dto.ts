import { ApiProperty } from '@nestjs/swagger';
import { CarSkin } from '../../../domain/entities/car-skin.entity';

export class CarSkinResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'purple' }) code!: string;
  @ApiProperty({ example: 'Púrpura' }) name!: string;
  @ApiProperty({ example: 'res://models/vehicle-truck-purple.glb' })
  modelPath!: string;
  @ApiProperty() isUnlockedByDefault!: boolean;
  @ApiProperty({ nullable: true, description: 'null = no está a la venta.' })
  priceCoins!: number | null;
  @ApiProperty() isActive!: boolean;

  static fromDomain(skin: CarSkin): CarSkinResponseDto {
    const dto = new CarSkinResponseDto();
    dto.id = skin.id;
    dto.code = skin.code;
    dto.name = skin.name;
    dto.modelPath = skin.modelPath;
    dto.isUnlockedByDefault = skin.isUnlockedByDefault;
    dto.priceCoins = skin.priceCoins;
    dto.isActive = skin.isActive;
    return dto;
  }
}
