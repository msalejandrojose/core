import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectDataFields, findDataField } from './walk.ts';
import { defineForm, getDefaultValues } from './defineForm.ts';

const schema = defineForm({
  fields: [
    { type: 'heading', text: 'Datos' },
    { type: 'email', name: 'email' },
    { type: 'number', name: 'edad' },
    { type: 'multiselect', name: 'tags', options: [] },
    { type: 'checkbox', name: 'acepta' },
    { type: 'select', name: 'rol', options: [], defaultValue: 'admin' },
    {
      type: 'group',
      fields: [
        { type: 'text', name: 'firstName' },
        { type: 'text', name: 'lastName' },
      ],
    },
    { type: 'divider' },
  ],
});

test('collectDataFields aplana grupos e ignora helpers', () => {
  const names = collectDataFields(schema.fields).map((f) => f.name);
  assert.deepEqual(names, [
    'email',
    'edad',
    'tags',
    'acepta',
    'rol',
    'firstName',
    'lastName',
  ]);
});

test('findDataField busca en todo el árbol', () => {
  assert.equal(findDataField(schema.fields, 'lastName')?.type, 'text');
  assert.equal(findDataField(schema.fields, 'noexiste'), undefined);
});

test('getDefaultValues usa defaultValue y fallback por tipo', () => {
  assert.deepEqual(getDefaultValues(schema), {
    email: '',
    edad: null,
    tags: [],
    acepta: false,
    rol: 'admin',
    firstName: '',
    lastName: '',
  });
});
