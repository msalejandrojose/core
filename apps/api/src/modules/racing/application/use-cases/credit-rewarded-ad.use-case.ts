import { Inject, Injectable } from '@nestjs/common';
import { RacingWallet } from '../../domain/entities/racing-wallet.entity';
import { rewardedAdCoinReward } from '../../domain/racing-coin-rewards';
import {
  RACING_COIN_REWARD_CONFIG_REPOSITORY,
  type RacingCoinRewardConfigRepositoryPort,
} from '../ports/racing-coin-reward-config-repository.port';
import {
  RACING_WALLET_REPOSITORY,
  type RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';

// El anuncio ACELERA la progresión, no es la única vía de conseguir
// monedas (TASK-286). De momento se fía de que el cliente solo llame aquí
// tras enseñar de verdad un anuncio recompensado hasta el final — validar
// la respuesta del SDK de anuncios es alcance de la fase de monetización
// (ver "Sistema de anuncios y monetización" en Notion), no de este ticket.
@Injectable()
export class CreditRewardedAdUseCase {
  constructor(
    @Inject(RACING_WALLET_REPOSITORY)
    private readonly wallets: RacingWalletRepositoryPort,
    @Inject(RACING_COIN_REWARD_CONFIG_REPOSITORY)
    private readonly rewardConfigs: RacingCoinRewardConfigRepositoryPort,
  ) {}

  async execute(userId: string): Promise<RacingWallet> {
    const amounts = await this.rewardConfigs.getAmounts();
    const reward = rewardedAdCoinReward(amounts);
    const balance = reward
      ? await this.wallets.credit({
          userId,
          amount: reward.amount,
          source: reward.source,
        })
      : await this.wallets.getBalance(userId);
    return new RacingWallet(userId, balance);
  }
}
