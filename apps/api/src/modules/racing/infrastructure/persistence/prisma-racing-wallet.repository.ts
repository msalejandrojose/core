import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreditCoinsData,
  RacingWalletRepositoryPort,
} from '../../application/ports/racing-wallet-repository.port';

@Injectable()
export class PrismaRacingWalletRepository implements RacingWalletRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string): Promise<number> {
    const wallet = await this.prisma.racingWallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    return wallet?.balance ?? 0;
  }

  // Transacción: el saldo materializado y el movimiento del historial se
  // escriben juntos o no se escribe ninguno — un fallo a mitad no puede
  // dejar el saldo sin su rastro auditable, ni al revés.
  async credit(data: CreditCoinsData): Promise<number> {
    const wallet = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.racingWallet.upsert({
        where: { userId: data.userId },
        create: { userId: data.userId, balance: data.amount },
        update: { balance: { increment: data.amount } },
      });
      await tx.racingCoinLedgerEntry.create({
        data: {
          userId: data.userId,
          amount: data.amount,
          source: data.source,
          onlineRaceId: data.onlineRaceId,
          lapTimeId: data.lapTimeId,
        },
      });
      return updated;
    });
    return wallet.balance;
  }
}
