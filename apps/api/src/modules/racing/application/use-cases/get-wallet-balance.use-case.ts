import { Inject, Injectable } from '@nestjs/common';
import { RacingWallet } from '../../domain/entities/racing-wallet.entity';
import {
  RACING_WALLET_REPOSITORY,
  type RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';

@Injectable()
export class GetWalletBalanceUseCase {
  constructor(
    @Inject(RACING_WALLET_REPOSITORY)
    private readonly wallets: RacingWalletRepositoryPort,
  ) {}

  async execute(userId: string): Promise<RacingWallet> {
    const balance = await this.wallets.getBalance(userId);
    return new RacingWallet(userId, balance);
  }
}
