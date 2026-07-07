import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isIban,
  isInteger,
  isLuhnValid,
  isPhone,
  isSpanishTaxId,
  isTaxId,
  isUrl,
} from './formats.ts';
import { validateForm } from './validate.ts';
import { defineForm } from '../helpers/defineForm.ts';

test('isUrl acepta http(s) y rechaza lo demás', () => {
  assert.equal(isUrl('https://example.com'), true);
  assert.equal(isUrl('http://a.b/c?d=1'), true);
  assert.equal(isUrl('ftp://x.y'), false);
  assert.equal(isUrl('no es url'), false);
  assert.equal(isUrl(''), false);
});

test('isInteger coacciona strings', () => {
  assert.equal(isInteger(3), true);
  assert.equal(isInteger('3'), true);
  assert.equal(isInteger(3.5), false);
  assert.equal(isInteger('x'), false);
});

test('isPhone acepta formatos internacionales laxos', () => {
  assert.equal(isPhone('+34 600 123 456'), true);
  assert.equal(isPhone('600123456'), true);
  assert.equal(isPhone('123'), false);
  assert.equal(isPhone('abc'), false);
});

test('isLuhnValid valida tarjetas', () => {
  assert.equal(isLuhnValid('4111 1111 1111 1111'), true);
  assert.equal(isLuhnValid('4111111111111112'), false);
});

test('isIban valida checksum mod-97', () => {
  assert.equal(isIban('GB82 WEST 1234 5698 7654 32'), true);
  assert.equal(isIban('ES9121000418450200051332'), true);
  assert.equal(isIban('ES0000000000000000000000'), false);
  assert.equal(isIban('XX'), false);
});

test('isSpanishTaxId valida NIF, NIE y CIF', () => {
  assert.equal(isSpanishTaxId('12345678Z'), true); // NIF
  assert.equal(isSpanishTaxId('X1234567L'), true); // NIE
  assert.equal(isSpanishTaxId('A58818501'), true); // CIF
  assert.equal(isSpanishTaxId('12345678A'), false); // letra errónea
  assert.equal(isSpanishTaxId('foobar'), false);
});

test('isTaxId enruta por país y acepta no-ES no vacío', () => {
  assert.equal(isTaxId('12345678Z', 'ES'), true);
  assert.equal(isTaxId('cualquier-cosa', 'FR'), true);
  assert.equal(isTaxId('', 'FR'), false);
});

test('validateForm aplica las validaciones built-in nuevas', () => {
  const schema = defineForm({
    fields: [
      { type: 'iban', name: 'iban', validations: [{ kind: 'iban' }] },
      {
        type: 'taxId',
        name: 'nif',
        validations: [{ kind: 'taxId', country: 'ES' }],
      },
      { type: 'url', name: 'web', validations: [{ kind: 'url' }] },
    ],
  });

  const bad = validateForm(schema, {
    iban: 'ES0000000000000000000000',
    nif: '00000000X',
    web: 'nope',
  });
  assert.equal(bad.valid, false);
  assert.ok(bad.errors['iban']);
  assert.ok(bad.errors['nif']);
  assert.ok(bad.errors['web']);

  const good = validateForm(schema, {
    iban: 'GB82WEST12345698765432',
    nif: '12345678Z',
    web: 'https://example.com',
  });
  assert.equal(good.valid, true);
});
