import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CarShopRepositoryPort,
  PurchaseCarItemData,
} from '../../application/ports/car-shop-repository.port';
import { CarItemAlreadyOwnedError } from '../../domain/errors/car-item-already-owned.error';
import { InsufficientCoinsError } from '../../domain/errors/insufficient-coins.error';
import { RacingCoinSource } from '../../domain/entities/racing-wallet.entity';

function isUniqueOwnershipViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class PrismaCarShopRepository implements CarShopRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async purchase(data: PurchaseCarItemData): Promise<number> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Descuento condicional: el `WHERE balance >= price` lo evalúa MySQL
        // de forma atómica en la propia fila — es lo que evita el
        // doble-gasto si dos compras del mismo jugador se cruzan, sin
        // necesitar un lock explícito aparte.
        const debit = await tx.racingWallet.updateMany({
          where: { userId: data.userId, balance: { gte: data.priceCoins } },
          data: { balance: { decrement: data.priceCoins } },
        });
        if (debit.count === 0) {
          throw new InsufficientCoinsError(data.priceCoins);
        }

        await tx.racingCoinLedgerEntry.create({
          data: {
            userId: data.userId,
            amount: -data.priceCoins,
            source: this.sourceFor(data.itemType),
            archetypeId: data.itemType === 'ARCHETYPE' ? data.itemId : null,
            partId: data.itemType === 'PART' ? data.itemId : null,
            skinId: data.itemType === 'SKIN' ? data.itemId : null,
          },
        });

        // `create`, no `upsert`: para una compra de verdad esto siempre
        // tiene que ser una fila nueva. Si ya existía (dos compras a la vez
        // del mismo objeto), el índice único de la tabla lo rechaza y la
        // transacción entera revierte — el jugador no pierde monedas por
        // una compra que no llegó a concederle nada.
        switch (data.itemType) {
          case 'ARCHETYPE':
            await tx.playerCarArchetype.create({
              data: { userId: data.userId, archetypeId: data.itemId },
            });
            break;
          case 'PART':
            await tx.playerCarPart.create({
              data: { userId: data.userId, partId: data.itemId },
            });
            break;
          case 'SKIN':
            await tx.playerCarSkin.create({
              data: { userId: data.userId, skinId: data.itemId },
            });
            break;
        }

        const wallet = await tx.racingWallet.findUniqueOrThrow({
          where: { userId: data.userId },
        });
        return wallet.balance;
      });
    } catch (error) {
      if (isUniqueOwnershipViolation(error)) {
        throw new CarItemAlreadyOwnedError(data.itemId);
      }
      throw error;
    }
  }

  private sourceFor(itemType: PurchaseCarItemData['itemType']): RacingCoinSource {
    switch (itemType) {
      case 'ARCHETYPE':
        return RacingCoinSource.PURCHASE_ARCHETYPE;
      case 'PART':
        return RacingCoinSource.PURCHASE_PART;
      case 'SKIN':
        return RacingCoinSource.PURCHASE_SKIN;
    }
  }
}
