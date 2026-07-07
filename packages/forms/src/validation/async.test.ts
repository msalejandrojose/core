import assert from 'node:assert/strict';
import { test } from 'node:test';
import { collectAsyncValidations } from './async.ts';
import { defineForm } from '../helpers/defineForm.ts';

test('collectAsyncValidations recoge las validaciones async con su campo', () => {
  const schema = defineForm({
    fields: [
      {
        type: 'email',
        name: 'email',
        validations: [
          { kind: 'required' },
          { kind: 'async', ref: 'email-available', message: 'Ya existe' },
        ],
      },
      { type: 'text', name: 'nombre', validations: [{ kind: 'required' }] },
      {
        type: 'group',
        fields: [
          {
            type: 'text',
            name: 'usuario',
            validations: [{ kind: 'async', ref: 'username-available' }],
          },
        ],
      },
    ],
  });

  assert.deepEqual(collectAsyncValidations(schema), [
    { field: 'email', ref: 'email-available', message: 'Ya existe' },
    { field: 'usuario', ref: 'username-available', message: undefined },
  ]);
});

test('collectAsyncValidations devuelve [] sin validaciones async', () => {
  const schema = defineForm({
    fields: [{ type: 'text', name: 'a', validations: [{ kind: 'required' }] }],
  });
  assert.deepEqual(collectAsyncValidations(schema), []);
});
