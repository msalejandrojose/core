import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsUUID } from 'class-validator';
import type { CarShopItemType } from '../../../application/ports/car-shop-repository.port';

const ITEM_TYPES: CarShopItemType[] = ['ARCHETYPE', 'PART', 'SKIN'];

export class PurchaseCarItemDto {
  @ApiProperty({ enum: ITEM_TYPES })
  @IsIn(ITEM_TYPES)
  itemType!: CarShopItemType;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  itemId!: string;
}
