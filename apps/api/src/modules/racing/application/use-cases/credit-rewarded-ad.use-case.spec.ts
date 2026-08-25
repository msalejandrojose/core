import { RacingCoinRewardKey } from '../../domain/entities/racing-coin-reward-config.entity';
import { RacingCoinSource } from '../../domain/entities/racing-wallet.entity';
import { RacingCoinRewardAmounts } from '../../domain/racing-coin-rewards';
import { RacingCoinRewardConfigRepositoryPort } from '../ports/racing-coin-reward-config-repository.port';
import {
  CreditCoinsData,
  RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';
import { CreditRewardedAdUseCase } from './credit-rewarded-ad.use-case';

const USER_ID = 'user-1';

class FakeRacingWalletRepository implements Partial<RacingWalletRepositoryPort> {
  credits: CreditCoinsData[] = [];
  constructor(private readonly balance = 0) {}

  getBalance(): Promise<number> {
    return Promise.resolve(this.balance);
  }

  credit(data: CreditCoinsData): Promise<number> {
    this.credits.push(data);
    return Promise.resolve(this.balance + data.amount);
  }
}

class FakeRacingCoinRewardConfigRepository
  implements Partial<RacingCoinRewardConfigRepositoryPort>
{
  constructor(private readonly amounts: RacingCoinRewardAmounts) {}

  getAmounts(): Promise<RacingCoinRewardAmounts> {
    return Promise.resolve(this.amounts);
  }
}

function useCase(amount: number, balance = 0) {
  const wallets = new FakeRacingWalletRepository(balance);
  const rewardConfigs = new FakeRacingCoinRewardConfigRepository(
    new Map([[RacingCoinRewardKey.REWARDED_AD, amount]]),
  );
  return {
    uc: new CreditRewardedAdUseCase(
      wallets as unknown as RacingWalletRepositoryPort,
      rewardConfigs as unknown as RacingCoinRewardConfigRepositoryPort,
    ),
    wallets,
  };
}

describe('CreditRewardedAdUseCase', () => {
  it('acredita el importe configurado por ver el anuncio', async () => {
    const { uc, wallets } = useCase(100);

    const wallet = await uc.execute(USER_ID);

    expect(wallets.credits).toEqual([
      { userId: USER_ID, amount: 100, source: RacingCoinSource.REWARDED_AD },
    ]);
    expect(wallet.balance).toBe(100);
  });

  it('con el importe a 0, no acredita nada y devuelve el saldo actual', async () => {
    const { uc, wallets } = useCase(0, 40);

    const wallet = await uc.execute(USER_ID);

    expect(wallets.credits).toHaveLength(0);
    expect(wallet.balance).toBe(40);
  });
});
