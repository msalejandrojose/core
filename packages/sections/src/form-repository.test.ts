import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  defineForm,
  resolveFormRepositories,
  type FormRepositoryRegistry,
} from '@core/forms';
import { createSectionFormRepository } from './form-repository.ts';
import type { Section } from './types.js';

function section(partial: Partial<Section> & Pick<Section, 'id' | 'code' | 'name'>): Section {
  return {
    scope: 'BACKOFFICE',
    order: 0,
    isActive: true,
    ...partial,
  };
}

const sections: Section[] = [
  section({ id: 'iam', code: 'iam', name: 'IAM' }),
  section({ id: 'users', code: 'iam.users', name: 'Usuarios', parentId: 'iam' }),
  section({ id: 'roles', code: 'iam.roles', name: 'Roles', parentId: 'iam' }),
  section({ id: 'home', code: 'home', name: 'Inicio', scope: 'APP' }),
];

const repo = createSectionFormRepository({ listSections: () => sections });
const registry: FormRepositoryRegistry = { Section: repo };

test('resuelve un selector de sección en un formulario declarativo', async () => {
  const schema = defineForm({
    fields: [
      {
        type: 'select',
        name: 'sectionId',
        label: 'Sección',
        source: { repository: 'Section' },
      },
    ],
  });

  const resolved = await resolveFormRepositories(schema, registry);
  const field = resolved.fields[0];

  assert.equal(field.type, 'select');
  assert.ok(field.type === 'select' && field.options, 'el campo tiene options');
  // Un renderer ya podría pintar el <select> con estas opciones.
  assert.deepEqual(
    field.options!.map((o) => o.value),
    sections.map((s) => s.id),
  );
  assert.deepEqual(
    field.options!.map((o) => o.label),
    ['IAM', 'Usuarios', 'Roles', 'Inicio'],
  );
});

test('filtra por scope desde la query del source', async () => {
  const schema = defineForm({
    fields: [
      {
        type: 'select',
        name: 'sectionId',
        label: 'Sección',
        source: { repository: 'Section', query: { filters: { scope: 'APP' } } },
      },
    ],
  });

  const resolved = await resolveFormRepositories(schema, registry);
  const field = resolved.fields[0];
  assert.ok(field.type === 'select' && field.options);
  assert.deepEqual(
    field.options!.map((o) => o.value),
    ['home'],
  );
});

test('list soporta búsqueda por nombre/código y devuelve total', async () => {
  const result = await repo.list({ search: 'iam' });
  assert.deepEqual(
    result.options.map((o) => o.value),
    ['iam', 'users', 'roles'],
  );
  assert.equal(result.total, 3);
});

test('cada opción lleva parentValue para selectores en cascada', async () => {
  const result = await repo.list();
  const users = result.options.find((o) => o.value === 'users');
  assert.equal(users?.parentValue, 'iam');
  const iam = result.options.find((o) => o.value === 'iam');
  assert.equal(iam?.parentValue, null);
});

test('getByValue resuelve una sección concreta', async () => {
  assert.equal((await repo.getByValue('roles'))?.label, 'Roles');
  assert.equal(await repo.getByValue('desconocido'), null);
});
