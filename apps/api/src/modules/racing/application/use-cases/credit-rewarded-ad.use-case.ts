import { Inject, Injectable } from '@nestjs/common';
import { RacingWallet } from '../../domain/entities/racing-wallet.entity';
import { REWARDED_AD_COIN_REWARD } from '../../domain/racing-coin-rewards';
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
  ) {}

  async execute(userId: string): Promise<RacingWallet> {
    const balance = await this.wallets.credit({
      userId,
      amount: REWARDED_AD_COIN_REWARD.amount,
      source: REWARDED_AD_COIN_REWARD.source,
    });
    return new RacingWallet(userId, balance);
  }
}
