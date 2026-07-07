import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectDataFields, isDataField } from './walk.ts';
import { defineForm, getDefaultValues } from './defineForm.ts';

test('getDefaultValues cubre los value objects de los nuevos tipos', () => {
  const schema = defineForm({
    fields: [
      { type: 'tags', name: 'tags' },
      { type: 'rating', name: 'rating' },
      { type: 'currency', name: 'precio' },
      { type: 'consent', name: 'rgpd', text: 'Acepto' },
      { type: 'dateRange', name: 'periodo' },
      { type: 'address', name: 'direccion' },
      { type: 'coordinates', name: 'geo' },
      { type: 'keyValue', name: 'meta' },
      { type: 'json', name: 'extra' },
      { type: 'avatar', name: 'foto' },
      { type: 'country', name: 'pais' },
    ],
  });

  assert.deepEqual(getDefaultValues(schema), {
    tags: [],
    rating: null,
    precio: null,
    rgpd: false,
    periodo: { from: null, to: null },
    direccion: {},
    geo: null,
    meta: [],
    extra: null,
    foto: null,
    pais: '',
  });
});

test('paragraph es UI (no produce valor); consent sí', () => {
  const schema = defineForm({
    fields: [
      { type: 'paragraph', text: 'Lee esto' },
      { type: 'consent', name: 'ok', text: 'Acepto' },
    ],
  });
  const names = collectDataFields(schema.fields).map((f) => f.name);
  assert.deepEqual(names, ['ok']);
  assert.equal(isDataField({ type: 'paragraph', text: 'x' }), false);
  assert.equal(
    isDataField({ type: 'consent', name: 'ok', text: 'x' }),
    true,
  );
});

test('array es un campo de datos y no se aplana como group', () => {
  const schema = defineForm({
    fields: [
      {
        type: 'array',
        name: 'lineas',
        fields: [
          { type: 'text', name: 'concepto' },
          { type: 'currency', name: 'importe' },
        ],
      },
    ],
  });
  // El array cuenta como UN campo (su valor anida); no expone sus hijos.
  const names = collectDataFields(schema.fields).map((f) => f.name);
  assert.deepEqual(names, ['lineas']);
  assert.deepEqual(getDefaultValues(schema), { lineas: [] });
});
