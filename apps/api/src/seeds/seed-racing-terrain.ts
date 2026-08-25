import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { TerrainType } from '../modules/racing/domain/track-terrain';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente de los factores de terreno de sección (TASK-270/304).
//
// Conjunto CERRADO de cuatro filas — a diferencia de arquetipos/piezas, no
// hay create/delete desde el backoffice, solo ajustar estos números. Los
// valores de partida son la decisión de TASK-270; el editor del backoffice
// (TASK-304) los cambia después sin necesidad de volver a correr este seed.

interface TerrainEffectSeed {
  type: TerrainType;
  grip: number;
  slowsTopSpeed: boolean;
}

const TERRAIN_EFFECTS: readonly TerrainEffectSeed[] = [
  { type: TerrainType.ASPHALT, grip: 1.0, slowsTopSpeed: false },
  { type: TerrainType.ICE, grip: 0.4, slowsTopSpeed: false },
  { type: TerrainType.MUD, grip: 0.6, slowsTopSpeed: true },
  { type: TerrainType.WATER, grip: 0.75, slowsTopSpeed: false },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const effect of TERRAIN_EFFECTS) {
    const data = { grip: effect.grip, slowsTopSpeed: effect.slowsTopSpeed };
    await prisma.racingTerrainEffect.upsert({
      where: { type: effect.type },
      create: { type: effect.type, ...data },
      update: data,
    });
    console.log(
      `✓ terreno ${effect.type.padEnd(10)} grip=${effect.grip} frena_velocidad=${effect.slowsTopSpeed}`,
    );
  }

  console.log(`\n${TERRAIN_EFFECTS.length} tipos de terreno sembrados.`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
