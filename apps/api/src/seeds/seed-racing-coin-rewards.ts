import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RacingCoinRewardKey } from '../modules/racing/domain/entities/racing-coin-reward-config.entity';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente de los importes de la economía de monedas (TASK-322).
//
// Conjunto CERRADO de nueve filas — igual que los factores de terreno
// (`seed-racing-terrain.ts`): no hay create/delete desde el backoffice,
// solo ajustar el número. Los valores de partida son los ya decididos por
// el usuario en TASK-286/321; el editor del backoffice los cambia después
// sin necesidad de volver a correr este seed.

interface CoinRewardSeed {
  key: RacingCoinRewardKey;
  amount: number;
}

const COIN_REWARDS: readonly CoinRewardSeed[] = [
  { key: RacingCoinRewardKey.RACE_FIRST_PLACE, amount: 100 },
  { key: RacingCoinRewardKey.RACE_SECOND_PLACE, amount: 60 },
  { key: RacingCoinRewardKey.RACE_THIRD_PLACE, amount: 40 },
  { key: RacingCoinRewardKey.REWARDED_AD, amount: 100 },
  { key: RacingCoinRewardKey.PERSONAL_BEST, amount: 50 },
  { key: RacingCoinRewardKey.BEAT_FRIEND, amount: 60 },
  { key: RacingCoinRewardKey.WIN_STREAK_2, amount: 20 },
  { key: RacingCoinRewardKey.WIN_STREAK_3, amount: 40 },
  { key: RacingCoinRewardKey.WIN_STREAK_4_PLUS, amount: 60 },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const reward of COIN_REWARDS) {
    await prisma.racingCoinRewardConfig.upsert({
      where: { key: reward.key },
      create: { key: reward.key, amount: reward.amount },
      // Solo crea si falta — un re-run del seed no debe pisar un importe que
      // el admin ya ajustó desde el backoffice.
      update: {},
    });
    console.log(`✓ bono ${reward.key.padEnd(18)} importe de partida=${reward.amount}`);
  }

  console.log(`\n${COIN_REWARDS.length} importes de monedas sembrados (si faltaban).`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
