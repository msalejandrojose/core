import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Prisma } from '../generated/prisma/client';
import { TrackTheme } from '../modules/racing/domain/entities/track.entity';
import {
  TrackCell,
  validateTrackPath,
} from '../modules/racing/domain/track-path';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente de los circuitos.
//
// La geometría (path/theme/grip) es una transcripción celda a celda del
// catálogo del cliente (`apps/game/scripts/track/track_catalog.gd`) — hasta
// que TASK-242/243 permitan crear circuitos directamente en el servidor, este
// es el único sitio donde se define. El sentido inverso reutiliza el mismo
// `path`: es la misma pista recorrida al revés, no otra geometría.
//
// Cada circuito se siembra en TODAS sus variantes jugables: dos sentidos por
// tres cilindradas. Un tiempo al revés no es comparable con uno normal, y uno a
// 150cc tampoco lo es con uno a 50cc, así que cada combinación es su propio
// leaderboard. El slug se compone igual que la clave de récord del cliente
// (`GameSettings.key_for`): "kenney-01-rev-150cc".

// Velocidad punta del coche, medida en el juego: 9,75 u/s a fondo en recta,
// prácticamente igual con y sin agarre (el agarre cambia lo que tardas en
// llegar a ella, no la punta).
const TOP_SPEED_UNITS_PER_SECOND = 9.75;

// Lado de una celda del circuito en unidades de mundo: 9,99 de `cell_size` por
// la escala 0,75 del GridMap.
const CELL_SIZE_UNITS = 9.99 * 0.75;

// La trazada por el interior de las curvas recorta algo respecto a la línea de
// centros de celda. Se descuenta con holgura para que el suelo de plausibilidad
// quede por debajo de cualquier vuelta humana posible.
const RACING_LINE_FACTOR = 0.75;

interface TrackSeed {
  slug: string;
  name: string;
  /// Celdas del trazado, en orden de recorrido hacia adelante.
  path: TrackCell[];
  /// Checkpoints intermedios; los sectores son uno más (la meta).
  checkpoints: number;
  theme: TrackTheme;
  grip: number;
}

// Multiplicador de velocidad punta de cada cilindrada. Tiene que coincidir con
// `GameSettings.ENGINE_SPEED` del juego: es lo que hace que el mínimo físico de
// cada clase esté donde toca. A 150cc el coche corre más, así que el suelo baja.
const ENGINE_CLASSES: ReadonlyArray<{ name: string; speed: number }> = [
  { name: '50cc', speed: 0.72 },
  { name: '100cc', speed: 1.0 },
  { name: '150cc', speed: 1.32 },
];

const TRACKS: readonly TrackSeed[] = [
  {
    slug: 'kenney-01',
    name: 'Kenney',
    checkpoints: 3,
    theme: TrackTheme.MEADOW,
    grip: 1.0,
    path: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: -1, y: 2 },
      { x: -2, y: 2 },
      { x: -2, y: 1 },
      { x: -2, y: 0 },
      { x: -2, y: -1 },
      { x: -3, y: -1 },
      { x: -3, y: -2 },
      { x: -3, y: -3 },
      { x: -2, y: -3 },
      { x: -1, y: -3 },
      { x: 0, y: -3 },
      { x: 0, y: -2 },
      { x: 0, y: -1 },
    ],
  },
  {
    slug: 'herradura',
    name: 'Herradura',
    checkpoints: 3,
    theme: TrackTheme.MEADOW,
    grip: 1.0,
    path: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
      { x: 0, y: 4 },
      { x: -1, y: 4 },
      { x: -2, y: 4 },
      { x: -2, y: 3 },
      { x: -2, y: 2 },
      { x: -3, y: 2 },
      { x: -4, y: 2 },
      { x: -4, y: 1 },
      { x: -4, y: 0 },
      { x: -4, y: -1 },
      { x: -3, y: -1 },
      { x: -2, y: -1 },
      { x: -1, y: -1 },
      { x: 0, y: -1 },
    ],
  },
  {
    slug: 'chicane',
    name: 'Chicane',
    checkpoints: 3,
    theme: TrackTheme.MEADOW,
    grip: 1.0,
    path: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: -1, y: 2 },
      { x: -1, y: 3 },
      { x: -2, y: 3 },
      { x: -2, y: 2 },
      { x: -3, y: 2 },
      { x: -3, y: 1 },
      { x: -3, y: 0 },
      { x: -3, y: -1 },
      { x: -2, y: -1 },
      { x: -1, y: -1 },
      { x: 0, y: -1 },
    ],
  },
  {
    slug: 'nevado',
    name: 'Nevado',
    checkpoints: 4,
    theme: TrackTheme.SNOW,
    grip: 0.55,
    path: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 0, y: 3 },
      { x: -1, y: 3 },
      { x: -2, y: 3 },
      { x: -2, y: 2 },
      { x: -2, y: 1 },
      { x: -3, y: 1 },
      { x: -4, y: 1 },
      { x: -4, y: 2 },
      { x: -4, y: 3 },
      { x: -5, y: 3 },
      { x: -6, y: 3 },
      { x: -6, y: 2 },
      { x: -6, y: 1 },
      { x: -6, y: 0 },
      { x: -6, y: -1 },
      { x: -5, y: -1 },
      { x: -4, y: -1 },
      { x: -3, y: -1 },
      { x: -3, y: -2 },
      { x: -2, y: -2 },
      { x: -2, y: -1 },
      { x: -1, y: -1 },
      { x: 0, y: -1 },
    ],
  },
];

/**
 * Suelo de plausibilidad de una vuelta, en milisegundos.
 *
 * No es una estimación: es la barrera física. Recorrer el circuito exige
 * cubrir su longitud, y el coche no pasa de su velocidad punta, así que por
 * debajo de este tiempo la vuelta es imposible por mucho que se conduzca bien.
 * Un tiempo así solo puede venir de un payload manipulado.
 *
 * Las vueltas reales quedan muy por encima —el coche frena en cada curva—, con
 * lo que el filtro nunca puede rechazar a un jugador legítimo. Ese es el
 * criterio: preferimos dejar pasar tramposos sutiles a llamar tramposo a
 * alguien que solo es rápido.
 */
function minPlausibleMs(cells: number, engineSpeed: number): number {
  const distance = cells * CELL_SIZE_UNITS * RACING_LINE_FACTOR;
  const topSpeed = TOP_SPEED_UNITS_PER_SECOND * engineSpeed;
  return Math.floor((distance / topSpeed) * 1000);
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  let seeded = 0;

  for (const track of TRACKS) {
    // El servidor no confía ni en su propio seed: si alguien edita `path` a
    // mano y rompe una de las cuatro reglas del trazado, falla aquí, no
    // silenciosamente en el cliente.
    const validation = validateTrackPath(track.path);
    if (!validation.ok) {
      throw new Error(
        `Trazado inválido para ${track.slug}: ${validation.reason} (${JSON.stringify(validation.details)})`,
      );
    }

    for (const reversed of [false, true]) {
      for (const engine of ENGINE_CLASSES) {
        const slug = `${track.slug}${reversed ? '-rev' : ''}-${engine.name}`;
        const name = `${track.name}${reversed ? ' (inverso)' : ''} · ${engine.name}`;

        const data = {
          name,
          sectorCount: track.checkpoints + 1,
          minPlausibleMs: minPlausibleMs(track.path.length, engine.speed),
          isActive: true,
          path: track.path as unknown as Prisma.InputJsonValue,
          theme: track.theme,
          grip: track.grip,
        };

        await prisma.track.upsert({
          where: { slug },
          create: { slug, ...data },
          update: data,
        });

        seeded += 1;
        console.log(
          `✓ ${slug.padEnd(24)} sectores=${data.sectorCount} mínimo=${(
            data.minPlausibleMs / 1000
          ).toFixed(1)}s`,
        );
      }
    }
  }

  console.log(`\n${seeded} circuitos sembrados.`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
