import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { catalogCodeFor } from '../modules/brio/domain/services/hevy';
import { EXERCISES } from './brio-exercises.data';

/**
 * ¿Qué ejercicios de Hevy no tienen pareja en el catálogo de Brío?
 *
 *   HEVY_API_KEY=xxxx pnpm --filter @core/api hevy:coverage
 *
 * Baja todas las plantillas de ejercicio de Hevy con tu clave (Hevy Pro ›
 * Ajustes › Developer), prueba cada una contra el catálogo como hace la
 * importación y lista las que no casan. Deja el detalle en
 * `hevy-coverage.json` (título, tipo y músculos) para añadirlas a
 * `brio-exercises-hevy.data.ts`. No toca la base de datos.
 */

interface Template {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  is_custom: boolean;
}

async function main(): Promise<void> {
  const apiKey = process.env.HEVY_API_KEY?.trim();
  if (!apiKey) {
    console.error('Falta HEVY_API_KEY (Hevy › Ajustes › Developer).');
    process.exit(1);
  }
  const templates: Template[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const res = await fetch(
      `https://api.hevyapp.com/v1/exercise_templates?page=${page}&pageSize=100`,
      { headers: { 'api-key': apiKey, accept: 'application/json' } },
    );
    if (!res.ok) {
      console.error(`Hevy respondió ${res.status} en la página ${page}.`);
      process.exit(1);
    }
    const body = (await res.json()) as {
      page_count?: number;
      exercise_templates?: Template[];
    };
    templates.push(...(body.exercise_templates ?? []));
    if (page >= (body.page_count ?? 1)) break;
  }

  const codes = new Set(EXERCISES.map((e) => e.code));
  const builtIn = templates.filter((t) => !t.is_custom);
  const missing = builtIn.filter((t) => !catalogCodeFor(t.title, codes));
  const custom = templates.filter((t) => t.is_custom);

  console.log(
    `Hevy: ${builtIn.length} ejercicios propios de Hevy · ${custom.length} tuyos.`,
  );
  console.log(
    `Casan con Brío: ${builtIn.length - missing.length} · Sin pareja: ${missing.length}.`,
  );
  for (const t of missing)
    console.log(`  - ${t.title}  [${t.type}; ${t.primary_muscle_group}]`);

  const out = resolve('hevy-coverage.json');
  writeFileSync(
    out,
    JSON.stringify(
      missing.map((t) => ({
        title: t.title,
        type: t.type,
        primary: t.primary_muscle_group,
        secondary: t.secondary_muscle_groups,
      })),
      null,
      2,
    ),
  );
  console.log(`\nDetalle en ${out}`);
}

void main();
