import { randomUUID } from 'node:crypto';
import {
  DiscoveryService,
  MetadataScanner,
  NestFactory,
  Reflector,
} from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import {
  REQUIRES_PERMISSION_KEY,
  type RequiresPermissionMeta,
} from '../modules/iam/infrastructure/http/guards/permission.guard';

// Sincroniza la tabla `api_section` con las secciones referenciadas en los
// decoradores `@RequiresPermission` de los controllers de la API.
//
// Cómo funciona:
//   1. Bootstrap del AppModule en modo "application context" (sin HTTP).
//   2. Recorre todos los controllers y sus handlers buscando el metadata
//      `REQUIRES_PERMISSION_KEY` (lo pone el decorador).
//   3. Para cada code descubierto, expande sus ancestros vía split('.').
//      (`iam.users.create` → `iam.users.create`, `iam.users`, `iam`)
//   4. Asegura que existe una sección `root` que actúa como ancestro común
//      de las top-level (sin punto). Útil para "permiso ADMIN sobre todo".
//   5. Upsert ordenado de padres antes que hijos (topo sort por longitud
//      del code). Crea las que faltan, ajusta el `parentSectionId` si
//      cambió, deja las existentes intactas en otro caso.
//   6. Avisa de "huérfanas" (secciones en BBDD que ya no aparecen en el
//      código). NO las borra — eso requiere decisión manual porque puede
//      haber permisos colgados.
//
// Idempotente. Pensado para correrse en CI antes del deploy y/o en local
// tras añadir endpoints con @RequiresPermission.

const ROOT_CODE = 'root';

function defaultNameFromCode(code: string): string {
  // `iam.users` → `iam · users`. El admin puede editarlo después vía
  // PATCH /api-sections/:id.
  return code.split('.').join(' · ');
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const discovery = app.get(DiscoveryService);
  const scanner = app.get(MetadataScanner);
  const reflector = app.get(Reflector);
  const prisma = app.get(PrismaService);

  // ── 1. Recolectar codes referenciados en @RequiresPermission ──────────
  const discovered = new Set<string>();
  for (const wrapper of discovery.getControllers()) {
    const { instance } = wrapper;
    if (!instance) continue;
    const proto = Object.getPrototypeOf(instance) as Record<string, unknown>;
    const methodNames = scanner.getAllMethodNames(proto);

    for (const methodName of methodNames) {
      const handler = (instance as Record<string, unknown>)[methodName];
      if (typeof handler !== 'function') continue;
      // `getAllAndOverride` mira primero el método y, si no hay, la clase
      // (por si alguien aplica @RequiresPermission a nivel de controller).
      const meta = reflector.getAllAndOverride<RequiresPermissionMeta | undefined>(
        REQUIRES_PERMISSION_KEY,
        [handler, instance.constructor],
      );
      if (meta) discovered.add(meta.section);
    }
  }

  console.log(`→ Encontrados ${discovered.size} codes en @RequiresPermission`);

  // ── 2. Expandir ancestros vía split('.') y asegurar root ──────────────
  const wanted = new Set<string>([ROOT_CODE]);
  for (const code of discovered) {
    const parts = code.split('.');
    for (let i = 1; i <= parts.length; i++) {
      wanted.add(parts.slice(0, i).join('.'));
    }
  }

  // ── 3. Topo sort: root primero, luego padres antes que hijos ──────────
  const sortedCodes = Array.from(wanted).sort((a, b) => {
    if (a === ROOT_CODE) return -1;
    if (b === ROOT_CODE) return 1;
    return a.split('.').length - b.split('.').length || a.localeCompare(b);
  });

  // ── 4. Cargar existentes y hacer upsert en orden ──────────────────────
  const existing = await prisma.apiSection.findMany();
  const idByCode = new Map<string, string>(existing.map((r) => [r.code, r.id]));

  let createdCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;

  for (const code of sortedCodes) {
    let parentCode: string | null = null;
    if (code === ROOT_CODE) {
      parentCode = null;
    } else if (code.includes('.')) {
      parentCode = code.substring(0, code.lastIndexOf('.'));
    } else {
      // Top-level con un solo segmento (p.ej. `iam`, `catalog`) →
      // los enganchamos a `root` para que el ADMIN sobre root cubra todo.
      parentCode = ROOT_CODE;
    }
    const parentId = parentCode ? idByCode.get(parentCode) ?? null : null;

    const row = await prisma.apiSection.findUnique({ where: { code } });
    if (!row) {
      const created = await prisma.apiSection.create({
        data: {
          id: randomUUID(),
          code,
          name: defaultNameFromCode(code),
          parentSectionId: parentId,
        },
      });
      idByCode.set(code, created.id);
      createdCount++;
      console.log(`  + ${code}`);
    } else if (row.parentSectionId !== parentId) {
      const updated = await prisma.apiSection.update({
        where: { code },
        data: { parentSectionId: parentId },
      });
      idByCode.set(code, updated.id);
      updatedCount++;
      console.log(`  ~ ${code} (parent actualizado)`);
    } else {
      idByCode.set(code, row.id);
      unchangedCount++;
    }
  }

  // ── 5. Detectar huérfanas (existen en BBDD pero ya no en el código) ───
  const orphans = existing
    .filter((r) => !wanted.has(r.code))
    .map((r) => r.code);
  if (orphans.length > 0) {
    console.log('');
    console.log(`⚠️  ${orphans.length} sección(es) en BBDD sin @RequiresPermission asociado:`);
    for (const c of orphans) console.log(`     ${c}`);
    console.log('   (no se borran automáticamente; revísalas y borra con DELETE /api-sections/:id si están obsoletas.)');
  }

  console.log('');
  console.log('✓ Sync completado.');
  console.log(`  Creadas:      ${createdCount}`);
  console.log(`  Actualizadas: ${updatedCount}`);
  console.log(`  Sin cambios:  ${unchangedCount}`);
  if (orphans.length > 0) {
    console.log(`  Huérfanas:    ${orphans.length} (revisar)`);
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
