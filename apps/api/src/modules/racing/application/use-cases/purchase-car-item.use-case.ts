import { Inject, Injectable } from '@nestjs/common';
import { CarArchetypeNotFoundError } from '../../domain/errors/car-archetype-not-found.error';
import { CarItemAlreadyOwnedError } from '../../domain/errors/car-item-already-owned.error';
import { CarItemNotForSaleError } from '../../domain/errors/car-item-not-for-sale.error';
import { CarPartNotFoundError } from '../../domain/errors/car-part-not-found.error';
import { CarSkinNotFoundError } from '../../domain/errors/car-skin-not-found.error';
import {
  CAR_ARCHETYPE_REPOSITORY,
  type CarArchetypeRepositoryPort,
} from '../ports/car-archetype-repository.port';
import {
  CAR_PART_REPOSITORY,
  type CarPartRepositoryPort,
} from '../ports/car-part-repository.port';
import {
  CAR_SHOP_REPOSITORY,
  type CarShopItemType,
  type CarShopRepositoryPort,
} from '../ports/car-shop-repository.port';
import {
  CAR_SKIN_REPOSITORY,
  type CarSkinRepositoryPort,
} from '../ports/car-skin-repository.port';
import {
  PLAYER_CAR_ARCHETYPE_REPOSITORY,
  type PlayerCarArchetypeRepositoryPort,
} from '../ports/player-car-archetype-repository.port';
import {
  PLAYER_CAR_PART_REPOSITORY,
  type PlayerCarPartRepositoryPort,
} from '../ports/player-car-part-repository.port';
import {
  PLAYER_CAR_SKIN_REPOSITORY,
  type PlayerCarSkinRepositoryPort,
} from '../ports/player-car-skin-repository.port';

export interface PurchaseCarItemInput {
  userId: string;
  itemType: CarShopItemType;
  itemId: string;
}

// Comprar en la tienda del taller (TASK-320): el sumidero de verdad de la
// economía de monedas (TASK-286/318/319) — sin esto, comprar solo era una
// posibilidad teórica que dejaban lista los tickets anteriores.
//
// Las comprobaciones "bonitas" (no encontrado / ya lo tienes / no está a la
// venta) se hacen aquí, antes de tocar el dinero, para dar un error claro
// sin gastar una transacción. La comprobación de saldo y la concesión de
// propiedad SÍ tienen que ser atómicas de verdad — eso vive en
// `CarShopRepositoryPort.purchase()`, no aquí, porque dos compras a la vez
// del mismo objeto no se pueden descartar solo con una consulta previa.
@Injectable()
export class PurchaseCarItemUseCase {
  constructor(
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
    @Inject(PLAYER_CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypeOwnerships: PlayerCarArchetypeRepositoryPort,
    @Inject(PLAYER_CAR_PART_REPOSITORY)
    private readonly partOwnerships: PlayerCarPartRepositoryPort,
    @Inject(PLAYER_CAR_SKIN_REPOSITORY)
    private readonly skinOwnerships: PlayerCarSkinRepositoryPort,
    @Inject(CAR_SHOP_REPOSITORY) private readonly shop: CarShopRepositoryPort,
  ) {}

  async execute(input: PurchaseCarItemInput): Promise<number> {
    const { userId, itemType, itemId } = input;

    const {
      isUnlockedByDefault,
      priceCoins,
    } = await this.resolveItem(itemType, itemId);

    if (isUnlockedByDefault) {
      throw new CarItemAlreadyOwnedError(itemId);
    }
    if (await this.ownsAlready(userId, itemType, itemId)) {
      throw new CarItemAlreadyOwnedError(itemId);
    }
    if (priceCoins === null) {
      throw new CarItemNotForSaleError(itemId);
    }

    return this.shop.purchase({ userId, itemType, itemId, priceCoins });
  }

  private async resolveItem(
    itemType: CarShopItemType,
    itemId: string,
  ): Promise<{ isUnlockedByDefault: boolean; priceCoins: number | null }> {
    switch (itemType) {
      case 'ARCHETYPE': {
        const archetype = await this.archetypes.findById(itemId);
        if (!archetype) throw new CarArchetypeNotFoundError(itemId);
        return archetype;
      }
      case 'PART': {
        const part = await this.parts.findById(itemId);
        if (!part) throw new CarPartNotFoundError(itemId);
        return part;
      }
      case 'SKIN': {
        const skin = await this.skins.findById(itemId);
        if (!skin) throw new CarSkinNotFoundError(itemId);
        return skin;
      }
    }
  }

  private ownsAlready(
    userId: string,
    itemType: CarShopItemType,
    itemId: string,
  ): Promise<boolean> {
    switch (itemType) {
      case 'ARCHETYPE':
        return this.archetypeOwnerships.ownsArchetype(userId, itemId);
      case 'PART':
        return this.partOwnerships.ownsPart(userId, itemId);
      case 'SKIN':
        return this.skinOwnerships.ownsSkin(userId, itemId);
    }
  }
}
