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
}

const ARCHETYPES: readonly ArchetypeSeed[] = [
  {
    code: 'normal',
    name: 'Normal',
    speedScale: 1.0,
    grip: 1.0,
    offroadGripModifier: 1.0,
  },
  {
    code: 'f1',
    name: 'F1',
    speedScale: 1.25,
    grip: 1.0,
    offroadGripModifier: 0.85,
  },
  {
    code: '4x4',
    name: '4x4',
    speedScale: 0.85,
    grip: 1.0,
    offroadGripModifier: 1.15,
  },
];

interface PartSeed {
  code: string;
  category: CarPartCategory;
  name: string;
  speedScale: number;
  grip: number;
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
  },
  {
    code: 'tires-speed',
    category: CarPartCategory.TIRES,
    name: 'Neumáticos de velocidad',
    speedScale: 0.1,
    grip: -0.05,
  },
  {
    code: 'wing-big',
    category: CarPartCategory.WING,
    name: 'Alerón grande',
    speedScale: -0.08,
    grip: 0.12,
  },
  {
    code: 'wing-low',
    category: CarPartCategory.WING,
    name: 'Alerón bajo',
    speedScale: 0.08,
    grip: -0.06,
  },
  {
    code: 'chassis-light',
    category: CarPartCategory.CHASSIS,
    name: 'Chasis ligero',
    speedScale: 0.05,
    grip: -0.08,
  },
  {
    code: 'chassis-reinforced',
    category: CarPartCategory.CHASSIS,
    name: 'Chasis reforzado',
    speedScale: -0.03,
    grip: 0.08,
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
      isActive: true,
    };
    await prisma.carArchetype.upsert({
      where: { code: archetype.code },
      create: { code: archetype.code, ...data },
      update: data,
    });
    console.log(
      `✓ arquetipo ${archetype.code.padEnd(10)} speed=${archetype.speedScale} grip=${archetype.grip} offroad×${archetype.offroadGripModifier}`,
    );
  }

  for (const part of PARTS) {
    const data = {
      category: part.category,
      name: part.name,
      speedScale: part.speedScale,
      grip: part.grip,
      isActive: true,
    };
    await prisma.carPart.upsert({
      where: { code: part.code },
      create: { code: part.code, ...data },
      update: data,
    });
    console.log(
      `✓ pieza     ${part.code.padEnd(20)} [${part.category}] speed=${part.speedScale} grip=${part.grip}`,
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

  console.log(
    `\n${ARCHETYPES.length} arquetipos, ${PARTS.length} piezas y ${SKINS.length} skins sembrados.`,
  );
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
