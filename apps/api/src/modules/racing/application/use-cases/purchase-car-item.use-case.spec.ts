import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { CarPart, CarPartCategory } from '../../domain/entities/car-part.entity';
import { CarSkin } from '../../domain/entities/car-skin.entity';
import { CarArchetypeRepositoryPort } from '../ports/car-archetype-repository.port';
import { CarPartRepositoryPort } from '../ports/car-part-repository.port';
import {
  CarShopRepositoryPort,
  PurchaseCarItemData,
} from '../ports/car-shop-repository.port';
import { CarSkinRepositoryPort } from '../ports/car-skin-repository.port';
import { PlayerCarArchetypeRepositoryPort } from '../ports/player-car-archetype-repository.port';
import { PlayerCarPartRepositoryPort } from '../ports/player-car-part-repository.port';
import { PlayerCarSkinRepositoryPort } from '../ports/player-car-skin-repository.port';
import { PurchaseCarItemUseCase } from './purchase-car-item.use-case';

const FREE_ARCHETYPE = new CarArchetype(
  'a1',
  'normal',
  'Normal',
  1,
  1,
  1,
  true,
  null,
  true,
);
const LOCKED_ARCHETYPE = new CarArchetype(
  'a2',
  'f1',
  'F1',
  1.25,
  1,
  0.85,
  false,
  2000,
  true,
);
const NOT_FOR_SALE_ARCHETYPE = new CarArchetype(
  'a3',
  '4x4',
  '4x4',
  0.85,
  1,
  1.15,
  false,
  null,
  true,
);

const LOCKED_PART = new CarPart(
  'p1',
  'tires-speed',
  CarPartCategory.TIRES,
  'Neumáticos de velocidad',
  0.1,
  -0.05,
  false,
  300,
  true,
);

const LOCKED_SKIN = new CarSkin(
  's1',
  'gold',
  'Dorado',
  'res://models/vehicle-truck-gold.glb',
  false,
  1500,
  true,
);

class FakeArchetypes implements Partial<CarArchetypeRepositoryPort> {
  constructor(
    private readonly byId = new Map([
      [FREE_ARCHETYPE.id, FREE_ARCHETYPE],
      [LOCKED_ARCHETYPE.id, LOCKED_ARCHETYPE],
      [NOT_FOR_SALE_ARCHETYPE.id, NOT_FOR_SALE_ARCHETYPE],
    ]),
  ) {}
  findById(id: string): Promise<CarArchetype | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
}

class FakeParts implements Partial<CarPartRepositoryPort> {
  constructor(private readonly byId = new Map([[LOCKED_PART.id, LOCKED_PART]])) {}
  findById(id: string): Promise<CarPart | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
}

class FakeSkins implements Partial<CarSkinRepositoryPort> {
  constructor(private readonly byId = new Map([[LOCKED_SKIN.id, LOCKED_SKIN]])) {}
  findById(id: string): Promise<CarSkin | null> {
    return Promise.resolve(this.byId.get(id) ?? null);
  }
}

class FakeArchetypeOwnerships
  implements Partial<PlayerCarArchetypeRepositoryPort>
{
  constructor(private readonly owned = new Set<string>()) {}
  ownsArchetype(_userId: string, archetypeId: string): Promise<boolean> {
    return Promise.resolve(this.owned.has(archetypeId));
  }
}

class FakePartOwnerships implements Partial<PlayerCarPartRepositoryPort> {
  constructor(private readonly owned = new Set<string>()) {}
  ownsPart(_userId: string, partId: string): Promise<boolean> {
    return Promise.resolve(this.owned.has(partId));
  }
}

class FakeSkinOwnerships implements Partial<PlayerCarSkinRepositoryPort> {
  constructor(private readonly owned = new Set<string>()) {}
  ownsSkin(_userId: string, skinId: string): Promise<boolean> {
    return Promise.resolve(this.owned.has(skinId));
  }
}

class FakeCarShop implements CarShopRepositoryPort {
  lastPurchase: PurchaseCarItemData | null = null;
  purchase(data: PurchaseCarItemData): Promise<number> {
    this.lastPurchase = data;
    return Promise.resolve(9999);
  }
}

function buildUseCase(ownedArchetypeIds: Set<string> = new Set()) {
  const shop = new FakeCarShop();
  const uc = new PurchaseCarItemUseCase(
    new FakeArchetypes() as unknown as CarArchetypeRepositoryPort,
    new FakeParts() as unknown as CarPartRepositoryPort,
    new FakeSkins() as unknown as CarSkinRepositoryPort,
    new FakeArchetypeOwnerships(
      ownedArchetypeIds,
    ) as unknown as PlayerCarArchetypeRepositoryPort,
    new FakePartOwnerships() as unknown as PlayerCarPartRepositoryPort,
    new FakeSkinOwnerships() as unknown as PlayerCarSkinRepositoryPort,
    shop,
  );
  return { uc, shop };
}

describe('PurchaseCarItemUseCase', () => {
  it('rechaza un arquetipo que no existe', async () => {
    const { uc } = buildUseCase();
    await expect(
      uc.execute({ userId: 'u1', itemType: 'ARCHETYPE', itemId: 'missing' }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_ARCHETYPE_NOT_FOUND' });
  });

  it('rechaza una pieza que no existe', async () => {
    const { uc } = buildUseCase();
    await expect(
      uc.execute({ userId: 'u1', itemType: 'PART', itemId: 'missing' }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_PART_NOT_FOUND' });
  });

  it('rechaza un skin que no existe', async () => {
    const { uc } = buildUseCase();
    await expect(
      uc.execute({ userId: 'u1', itemType: 'SKIN', itemId: 'missing' }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_SKIN_NOT_FOUND' });
  });

  it('rechaza comprar algo que ya es gratis para todos (isUnlockedByDefault)', async () => {
    const { uc } = buildUseCase();
    await expect(
      uc.execute({
        userId: 'u1',
        itemType: 'ARCHETYPE',
        itemId: FREE_ARCHETYPE.id,
      }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_ITEM_ALREADY_OWNED' });
  });

  it('rechaza comprar algo que el jugador ya tiene desbloqueado', async () => {
    const { uc } = buildUseCase(new Set([LOCKED_ARCHETYPE.id]));
    await expect(
      uc.execute({
        userId: 'u1',
        itemType: 'ARCHETYPE',
        itemId: LOCKED_ARCHETYPE.id,
      }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_ITEM_ALREADY_OWNED' });
  });

  it('rechaza comprar algo bloqueado pero sin precio (no está a la venta)', async () => {
    const { uc } = buildUseCase();
    await expect(
      uc.execute({
        userId: 'u1',
        itemType: 'ARCHETYPE',
        itemId: NOT_FOR_SALE_ARCHETYPE.id,
      }),
    ).rejects.toMatchObject({ code: 'RACING_CAR_ITEM_NOT_FOR_SALE' });
  });

  it('compra un arquetipo bloqueado y a la venta, con su precio de verdad', async () => {
    const { uc, shop } = buildUseCase();
    const balance = await uc.execute({
      userId: 'u1',
      itemType: 'ARCHETYPE',
      itemId: LOCKED_ARCHETYPE.id,
    });

    expect(balance).toBe(9999);
    expect(shop.lastPurchase).toEqual({
      userId: 'u1',
      itemType: 'ARCHETYPE',
      itemId: LOCKED_ARCHETYPE.id,
      priceCoins: 2000,
    });
  });

  it('compra una pieza bloqueada, con su propio precio', async () => {
    const { uc, shop } = buildUseCase();
    await uc.execute({ userId: 'u1', itemType: 'PART', itemId: LOCKED_PART.id });

    expect(shop.lastPurchase?.priceCoins).toBe(300);
    expect(shop.lastPurchase?.itemType).toBe('PART');
  });

  it('compra un skin bloqueado, con su propio precio', async () => {
    const { uc, shop } = buildUseCase();
    await uc.execute({ userId: 'u1', itemType: 'SKIN', itemId: LOCKED_SKIN.id });

    expect(shop.lastPurchase?.priceCoins).toBe(1500);
    expect(shop.lastPurchase?.itemType).toBe('SKIN');
  });
});
