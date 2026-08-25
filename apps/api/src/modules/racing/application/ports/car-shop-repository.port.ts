export const CAR_SHOP_REPOSITORY = Symbol('RACING_CAR_SHOP_REPOSITORY');

export type CarShopItemType = 'ARCHETYPE' | 'PART' | 'SKIN';

export interface PurchaseCarItemData {
  userId: string;
  itemType: CarShopItemType;
  itemId: string;
  priceCoins: number;
}

export interface CarShopRepositoryPort {
  /** Todo en una transacción: descuenta el saldo (rechaza si no llega),
   *  registra el movimiento en el historial y da la propiedad — o nada de
   *  eso si falla cualquier paso. Devuelve el saldo resultante.
   *
   *  Lanza `InsufficientCoinsError` si el saldo no llega, o
   *  `CarItemAlreadyOwnedError` si dos compras a la vez del mismo objeto se
   *  cruzan (la propiedad tiene un índice único de verdad debajo — no es
   *  solo una comprobación de antes, es la garantía final). */
  purchase(data: PurchaseCarItemData): Promise<number>;
}
