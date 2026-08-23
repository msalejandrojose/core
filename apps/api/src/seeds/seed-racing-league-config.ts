import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RacingLeagueConfigKey } from '../modules/racing/domain/entities/racing-league-config.entity';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente de los puntos por posición y los umbrales de ascenso de
// las ligas por temporada (TASK-291).
//
// Conjunto CERRADO de siete filas — igual que los importes de la economía
// de monedas (`seed-racing-coin-rewards.ts`): no hay create/delete desde el
// backoffice, solo ajustar el número. Los umbrales de partida (50/150/350/
// 700) dan una progresión razonable jugando: cruzar a Plata en ~10
// podios, a Diamante en varias decenas.

interface LeagueConfigSeed {
  key: RacingLeagueConfigKey;
  value: number;
}

const LEAGUE_CONFIG: readonly LeagueConfigSeed[] = [
  { key: RacingLeagueConfigKey.POINTS_FIRST_PLACE, value: 10 },
  { key: RacingLeagueConfigKey.POINTS_SECOND_PLACE, value: 5 },
  { key: RacingLeagueConfigKey.POINTS_THIRD_PLACE, value: 1 },
  { key: RacingLeagueConfigKey.TIER_SILVER_THRESHOLD, value: 50 },
  { key: RacingLeagueConfigKey.TIER_GOLD_THRESHOLD, value: 150 },
  { key: RacingLeagueConfigKey.TIER_PLATINUM_THRESHOLD, value: 350 },
  { key: RacingLeagueConfigKey.TIER_DIAMOND_THRESHOLD, value: 700 },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const config of LEAGUE_CONFIG) {
    await prisma.racingLeagueConfig.upsert({
      where: { key: config.key },
      create: { key: config.key, value: config.value },
      // Solo crea si falta — un re-run del seed no debe pisar un valor que
      // el admin ya ajustó desde el backoffice.
      update: {},
    });
    console.log(`✓ liga ${config.key.padEnd(24)} valor de partida=${config.value}`);
  }

  console.log(`\n${LEAGUE_CONFIG.length} parámetros de liga sembrados (si faltaban).`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
