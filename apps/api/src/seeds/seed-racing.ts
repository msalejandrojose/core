import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente de los circuitos.
//
// El trazado en sí NO vive en la base de datos: lo construye el cliente desde
// su propio catálogo (`apps/game/scripts/track/track_catalog.gd`). Esta tabla
// es el ancla de los tiempos, así que aquí solo hay lo que el servidor
// necesita para validarlos y ordenarlos.
//
// Cada circuito se siembra DOS veces, una por sentido: una vuelta al revés no
// es comparable con una normal, así que son leaderboards separados. El slug
// inverso lleva sufijo "-rev", igual que la clave de récord del cliente.

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
  /// Celdas del trazado en el catálogo del cliente.
  cells: number;
  /// Checkpoints intermedios; los sectores son uno más (la meta).
  checkpoints: number;
}

const TRACKS: readonly TrackSeed[] = [
  { slug: 'kenney-01', name: 'Kenney', cells: 16, checkpoints: 3 },
  { slug: 'herradura', name: 'Herradura', cells: 18, checkpoints: 3 },
  { slug: 'chicane', name: 'Chicane', cells: 14, checkpoints: 3 },
  { slug: 'nevado', name: 'Nevado', cells: 26, checkpoints: 4 },
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
function minPlausibleMs(cells: number): number {
  const distance = cells * CELL_SIZE_UNITS * RACING_LINE_FACTOR;
  return Math.floor((distance / TOP_SPEED_UNITS_PER_SECOND) * 1000);
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const track of TRACKS) {
    for (const reversed of [false, true]) {
      const slug = reversed ? `${track.slug}-rev` : track.slug;
      const name = reversed ? `${track.name} (inverso)` : track.name;

      const data = {
        name,
        sectorCount: track.checkpoints + 1,
        minPlausibleMs: minPlausibleMs(track.cells),
        isActive: true,
      };

      await prisma.track.upsert({
        where: { slug },
        create: { slug, ...data },
        update: data,
      });

      console.log(
        `✓ ${slug.padEnd(18)} sectores=${data.sectorCount} mínimo=${(
          data.minPlausibleMs / 1000
        ).toFixed(1)}s`,
      );
    }
  }

  console.log(`\n${TRACKS.length * 2} circuitos sembrados.`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
