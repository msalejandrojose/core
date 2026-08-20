import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RacingMatchmakingConfigKey } from '../modules/racing/domain/entities/racing-matchmaking-config.entity';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente de los parámetros de matchmaking de la fase online real
// (TASK-323, tarea 8).
//
// Conjunto CERRADO de tres filas — igual que los importes de la economía de
// monedas (`seed-racing-coin-rewards.ts`): no hay create/delete desde el
// backoffice, solo ajustar el valor. Los valores de partida son los que ya
// estaban hardcodeados en el dominio (`compute-rating-changes.ts`,
// `matchmaking-rating-window.ts`, `live-race-room.manager.ts`); el editor
// del backoffice los cambia después sin necesidad de volver a correr esto.

interface MatchmakingConfigSeed {
  key: RacingMatchmakingConfigKey;
  value: number;
}

const MATCHMAKING_CONFIG: readonly MatchmakingConfigSeed[] = [
  { key: RacingMatchmakingConfigKey.RATING_K_FACTOR, value: 32 },
  { key: RacingMatchmakingConfigKey.RATING_WINDOW_BASE_POINTS, value: 100 },
  { key: RacingMatchmakingConfigKey.BOT_FILL_TIMEOUT_MS, value: 15_000 },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const config of MATCHMAKING_CONFIG) {
    await prisma.racingMatchmakingConfig.upsert({
      where: { key: config.key },
      create: { key: config.key, value: config.value },
      // Solo crea si falta — un re-run del seed no debe pisar un valor que
      // el admin ya ajustó desde el backoffice.
      update: {},
    });
    console.log(`✓ matchmaking ${config.key.padEnd(28)} valor de partida=${config.value}`);
  }

  console.log(`\n${MATCHMAKING_CONFIG.length} parámetros de matchmaking sembrados (si faltaban).`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
