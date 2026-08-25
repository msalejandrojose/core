import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CarPartCategory } from '../modules/racing/domain/entities/car-part.entity';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente del catálogo de arquetipos y piezas (TASK-262/263/265).
//
// Son valores de partida para playtesting, no constantes finales — se
// ajustan luego sin desplegar el juego desde el editor del backoffice
// (TASK-267). Cualquier cambio aquí rompe la comparabilidad de los tiempos
// ya guardados igual que un cambio de física: bump del `clientVersion` que
// ya usa `LapTime`, no un campo nuevo (criterio de done de TASK-265).

interface ArchetypeSeed {
  code: string;
  name: string;
  speedScale: number;
  grip: number;
  offroadGripModifier: number;
  // Precios de partida cerrados en "Diseñar la economía de monedas y
  // recompensas" (TASK-286/320): ajustables, sin validar con datos reales
  // todavía. `null` = gratis para todos (Normal, el arquetipo por defecto).
  priceCoins: number | null;
}

const ARCHETYPES: readonly ArchetypeSeed[] = [
  {
    code: 'normal',
    name: 'Normal',
    speedScale: 1.0,
    grip: 1.0,
    offroadGripModifier: 1.0,
    priceCoins: null,
  },
  {
    code: 'f1',
    name: 'F1',
    speedScale: 1.25,
    grip: 1.0,
    offroadGripModifier: 0.85,
    priceCoins: 2000,
  },
  {
    code: '4x4',
    name: '4x4',
    speedScale: 0.85,
    grip: 1.0,
    offroadGripModifier: 1.15,
    priceCoins: 2000,
  },
];

interface PartSeed {
  code: string;
  category: CarPartCategory;
  name: string;
  speedScale: number;
  grip: number;
  // Mismo criterio que `ArchetypeSeed.priceCoins` — las 6 piezas de hoy
  // cuestan lo mismo entre sí, sin distinguir por efecto.
  priceCoins: number;
}

interface SkinSeed {
  code: string;
  name: string;
  modelPath: string;
}

// Puramente cosmético (TASK-229): sin speedScale/grip. `purple` reutiliza el
// único color de camión del starter kit de Kenney que no está ya asignado a
// un arquetipo (normal=yellow, f1=red, 4x4=green) — ver
// apps/game/scripts/race/race_director.gd.
const SKINS: readonly SkinSeed[] = [
  {
    code: 'purple',
    name: 'Púrpura',
    modelPath: 'res://models/vehicle-truck-purple.glb',
  },
];

// Ninguna pieza es estrictamente mejor que otra en los dos ejes a la vez
// (regla no negociable de TASK-263): todas suben uno bajando el otro.
const PARTS: readonly PartSeed[] = [
  {
    code: 'tires-grip',
    category: CarPartCategory.TIRES,
    name: 'Neumáticos de agarre',
    speedScale: -0.05,
    grip: 0.1,
    priceCoins: 300,
  },
  {
    code: 'tires-speed',
    category: CarPartCategory.TIRES,
    name: 'Neumáticos de velocidad',
    speedScale: 0.1,
    grip: -0.05,
    priceCoins: 300,
  },
  {
    code: 'wing-big',
    category: CarPartCategory.WING,
    name: 'Alerón grande',
    speedScale: -0.08,
    grip: 0.12,
    priceCoins: 300,
  },
  {
    code: 'wing-low',
    category: CarPartCategory.WING,
    name: 'Alerón bajo',
    speedScale: 0.08,
    grip: -0.06,
    priceCoins: 300,
  },
  {
    code: 'chassis-light',
    category: CarPartCategory.CHASSIS,
    name: 'Chasis ligero',
    speedScale: 0.05,
    grip: -0.08,
    priceCoins: 300,
  },
  {
    code: 'chassis-reinforced',
    category: CarPartCategory.CHASSIS,
    name: 'Chasis reforzado',
    speedScale: -0.03,
    grip: 0.08,
    priceCoins: 300,
  },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const archetype of ARCHETYPES) {
    const data = {
      name: archetype.name,
      speedScale: archetype.speedScale,
      grip: archetype.grip,
      offroadGripModifier: archetype.offroadGripModifier,
      // Gratis (priceCoins null) = desbloqueado para todos. De pago =
      // bloqueado por defecto, la tienda (TASK-320) es quien lo desbloquea.
      isUnlockedByDefault: archetype.priceCoins === null,
      priceCoins: archetype.priceCoins,
      isActive: true,
    };
    await prisma.carArchetype.upsert({
      where: { code: archetype.code },
      create: { code: archetype.code, ...data },
      update: data,
    });
    const price = archetype.priceCoins === null ? 'gratis' : `${archetype.priceCoins} monedas`;
    console.log(
      `✓ arquetipo ${archetype.code.padEnd(10)} speed=${archetype.speedScale} grip=${archetype.grip} offroad×${archetype.offroadGripModifier} (${price})`,
    );
  }

  for (const part of PARTS) {
    const data = {
      category: part.category,
      name: part.name,
      speedScale: part.speedScale,
      grip: part.grip,
      isUnlockedByDefault: false,
      priceCoins: part.priceCoins,
      isActive: true,
    };
    await prisma.carPart.upsert({
      where: { code: part.code },
      create: { code: part.code, ...data },
      update: data,
    });
    console.log(
      `✓ pieza     ${part.code.padEnd(20)} [${part.category}] speed=${part.speedScale} grip=${part.grip} (${part.priceCoins} monedas)`,
    );
  }

  for (const skin of SKINS) {
    const data = {
      name: skin.name,
      modelPath: skin.modelPath,
      isUnlockedByDefault: true,
      isActive: true,
    };
    await prisma.carSkin.upsert({
      where: { code: skin.code },
      create: { code: skin.code, ...data },
      update: data,
    });
    console.log(`✓ skin      ${skin.code.padEnd(20)} ${skin.modelPath}`);
  }

  await grandfatherEquippedItems(prisma);

  console.log(
    `\n${ARCHETYPES.length} arquetipos, ${PARTS.length} piezas y ${SKINS.length} skins sembrados.`,
  );
  await app.close();
}

// Migración de jugadores existentes (TASK-320 activa el sumidero que
// TASK-286/319 dejaron listo, ver la nota "sin regresión hoy" de TASK-319):
// a nadie se le puede quitar lo que ya llevaba puesto solo porque a partir
// de ahora cueste monedas — se le regala la propiedad, no se le resetea el
// equipamiento. Solo mira `PlayerCarLoadout`, la única fuente de "qué tiene
// puesto cada jugador" que existe hoy. Idempotente (upsert): en sucesivas
// ejecuciones no hay nada nuevo que regalar salvo que alguien equipe algo
// recién bloqueado sin tenerlo — caso que ya bloquea `SetPlayerCarLoadoutUseCase`
// aparte, así que no debería darse.
async function grandfatherEquippedItems(prisma: PrismaService): Promise<void> {
  const loadouts = await prisma.playerCarLoadout.findMany({
    select: {
      userId: true,
      archetypeId: true,
      tiresPartId: true,
      wingPartId: true,
      chassisPartId: true,
    },
  });

  const lockedArchetypeIds = new Set(
    (
      await prisma.carArchetype.findMany({
        where: { isUnlockedByDefault: false },
        select: { id: true },
      })
    ).map((row) => row.id),
  );
  const lockedPartIds = new Set(
    (
      await prisma.carPart.findMany({
        where: { isUnlockedByDefault: false },
        select: { id: true },
      })
    ).map((row) => row.id),
  );

  let grantedArchetypes = 0;
  let grantedParts = 0;

  for (const loadout of loadouts) {
    if (lockedArchetypeIds.has(loadout.archetypeId)) {
      await prisma.playerCarArchetype.upsert({
        where: {
          userId_archetypeId: {
            userId: loadout.userId,
            archetypeId: loadout.archetypeId,
          },
        },
        create: { userId: loadout.userId, archetypeId: loadout.archetypeId },
        update: {},
      });
      grantedArchetypes++;
    }

    for (const partId of [
      loadout.tiresPartId,
      loadout.wingPartId,
      loadout.chassisPartId,
    ]) {
      if (partId && lockedPartIds.has(partId)) {
        await prisma.playerCarPart.upsert({
          where: { userId_partId: { userId: loadout.userId, partId } },
          create: { userId: loadout.userId, partId },
          update: {},
        });
        grantedParts++;
      }
    }
  }

  if (grantedArchetypes > 0 || grantedParts > 0) {
    console.log(
      `✓ migración: ${grantedArchetypes} arquetipo(s) y ${grantedParts} pieza(s) regalados a quien ya los llevaba puestos.`,
    );
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
