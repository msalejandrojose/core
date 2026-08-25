import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RacingCircuitRotationConfigKey } from '../modules/racing/domain/entities/racing-circuit-rotation-config.entity';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente del parámetro de la rotación diaria de circuitos
// (TASK-336).
//
// Conjunto CERRADO de una fila — mismo patrón que
// `seed-racing-league-config.ts`: sin create/delete desde el backoffice,
// solo ajustar el valor. Con los 4 circuitos de partida, 2 al día da una
// rotación visible desde ya.

interface CircuitRotationConfigSeed {
  key: RacingCircuitRotationConfigKey;
  value: number;
}

const CIRCUIT_ROTATION_CONFIG: readonly CircuitRotationConfigSeed[] = [
  { key: RacingCircuitRotationConfigKey.CIRCUITS_PER_DAY, value: 2 },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const config of CIRCUIT_ROTATION_CONFIG) {
    await prisma.racingCircuitRotationConfig.upsert({
      where: { key: config.key },
      create: { key: config.key, value: config.value },
      // Solo crea si falta — un re-run del seed no debe pisar un valor que
      // el admin ya ajustó desde el backoffice.
      update: {},
    });
    console.log(`✓ rotación ${config.key.padEnd(20)} valor de partida=${config.value}`);
  }

  console.log(`\n${CIRCUIT_ROTATION_CONFIG.length} parámetros de rotación sembrados (si faltaban).`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
