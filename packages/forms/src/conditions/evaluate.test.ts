import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Field } from '../types/field.ts';
import { evaluateCondition, isFieldEnabled, isFieldVisible } from './evaluate.ts';

test('operadores de igualdad', () => {
  const values = { tipo: 'EMPRESA' };
  assert.equal(
    evaluateCondition({ field: 'tipo', op: 'eq', value: 'EMPRESA' }, values),
    true,
  );
  assert.equal(
    evaluateCondition({ field: 'tipo', op: 'ne', value: 'EMPRESA' }, values),
    false,
  );
});

test('in / nin', () => {
  const values = { rol: 'admin' };
  assert.equal(
    evaluateCondition(
      { field: 'rol', op: 'in', values: ['admin', 'editor'] },
      values,
    ),
    true,
  );
  assert.equal(
    evaluateCondition({ field: 'rol', op: 'nin', values: ['editor'] }, values),
    true,
  );
});

test('truthy / falsy con arrays vacíos', () => {
  assert.equal(
    evaluateCondition({ field: 'tags', op: 'truthy' }, { tags: [] }),
    false,
  );
  assert.equal(
    evaluateCondition({ field: 'tags', op: 'truthy' }, { tags: ['a'] }),
    true,
  );
  assert.equal(
    evaluateCondition({ field: 'acepta', op: 'falsy' }, { acepta: false }),
    true,
  );
});

test('comparadores numéricos', () => {
  const values = { edad: 18 };
  assert.equal(evaluateCondition({ field: 'edad', op: 'gte', value: 18 }, values), true);
  assert.equal(evaluateCondition({ field: 'edad', op: 'gt', value: 18 }, values), false);
  assert.equal(evaluateCondition({ field: 'edad', op: 'lt', value: 21 }, values), true);
});

test('combinadores all / any / not', () => {
  const values = { tipo: 'EMPRESA', pais: 'ES' };
  assert.equal(
    evaluateCondition(
      {
        all: [
          { field: 'tipo', op: 'eq', value: 'EMPRESA' },
          { field: 'pais', op: 'eq', value: 'ES' },
        ],
      },
      values,
    ),
    true,
  );
  assert.equal(
    evaluateCondition(
      {
        any: [
          { field: 'tipo', op: 'eq', value: 'PARTICULAR' },
          { field: 'pais', op: 'eq', value: 'ES' },
        ],
      },
      values,
    ),
    true,
  );
  assert.equal(
    evaluateCondition({ not: { field: 'pais', op: 'eq', value: 'ES' } }, values),
    false,
  );
});

test('rutas con punto', () => {
  assert.equal(
    evaluateCondition(
      { field: 'direccion.pais', op: 'eq', value: 'ES' },
      { direccion: { pais: 'ES' } },
    ),
    true,
  );
});

test('isFieldVisible respeta hidden y visibleWhen', () => {
  const oculto: Field = { type: 'text', name: 'a', hidden: true };
  assert.equal(isFieldVisible(oculto, {}), false);

  const condicional: Field = {
    type: 'text',
    name: 'cif',
    visibleWhen: { field: 'tipo', op: 'eq', value: 'EMPRESA' },
  };
  assert.equal(isFieldVisible(condicional, { tipo: 'EMPRESA' }), true);
  assert.equal(isFieldVisible(condicional, { tipo: 'PARTICULAR' }), false);
});

test('isFieldEnabled respeta readOnly y enabledWhen', () => {
  const ro: Field = { type: 'text', name: 'a', readOnly: true };
  assert.equal(isFieldEnabled(ro, {}), false);

  const cond: Field = {
    type: 'text',
    name: 'b',
    enabledWhen: { field: 'acepta', op: 'truthy' },
  };
  assert.equal(isFieldEnabled(cond, { acepta: true }), true);
  assert.equal(isFieldEnabled(cond, { acepta: false }), false);
});
