import assert from 'node:assert/strict';
import { test } from 'node:test';
import { defineForm } from '../helpers/defineForm.ts';
import { validateForm } from './validate.ts';

const userForm = defineForm({
  id: 'create-user',
  fields: [
    {
      type: 'email',
      name: 'email',
      label: 'Email',
      validations: [{ kind: 'required' }, { kind: 'email' }],
    },
    {
      type: 'password',
      name: 'password',
      label: 'Contraseña',
      validations: [{ kind: 'required' }, { kind: 'minLength', value: 8 }],
    },
    {
      type: 'group',
      columns: 2,
      fields: [
        {
          type: 'text',
          name: 'firstName',
          validations: [{ kind: 'maxLength', value: 100 }],
        },
        { type: 'text', name: 'lastName' },
      ],
    },
  ],
});

test('formulario válido no produce errores', () => {
  const result = validateForm(userForm, {
    email: 'a@b.com',
    password: '12345678',
    firstName: 'Ana',
    lastName: 'Pi',
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('required y email fallan en valores vacíos/erróneos', () => {
  const result = validateForm(userForm, {
    email: 'no-es-email',
    password: '',
    firstName: '',
    lastName: '',
  });
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.email, ['Email inválido']);
  assert.equal(result.errors.password?.length, 1); // required
});

test('campos de grupo se validan (aplanados)', () => {
  const result = validateForm(userForm, {
    email: 'a@b.com',
    password: '12345678',
    firstName: 'x'.repeat(101),
    lastName: '',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.firstName);
});

test('required: true implícito sin validación explícita', () => {
  const schema = defineForm({
    fields: [{ type: 'text', name: 'nombre', required: true }],
  });
  const result = validateForm(schema, { nombre: '' });
  assert.deepEqual(result.errors.nombre, ['Este campo es obligatorio']);
});

test('mensaje custom sobreescribe el por defecto', () => {
  const schema = defineForm({
    fields: [
      {
        type: 'text',
        name: 'nombre',
        validations: [{ kind: 'required', message: 'Pon tu nombre' }],
      },
    ],
  });
  const result = validateForm(schema, { nombre: '' });
  assert.deepEqual(result.errors.nombre, ['Pon tu nombre']);
});

test('campos no visibles no se validan', () => {
  const schema = defineForm({
    fields: [
      { type: 'select', name: 'tipo', options: [], defaultValue: 'PARTICULAR' },
      {
        type: 'text',
        name: 'cif',
        required: true,
        visibleWhen: { field: 'tipo', op: 'eq', value: 'EMPRESA' },
      },
    ],
  });
  // tipo !== EMPRESA → cif oculto → no se valida pese a required
  assert.equal(validateForm(schema, { tipo: 'PARTICULAR', cif: '' }).valid, true);
  // tipo === EMPRESA → cif visible → required dispara
  assert.equal(validateForm(schema, { tipo: 'EMPRESA', cif: '' }).valid, false);
});

test('validador custom desde el registro', () => {
  const schema = defineForm({
    fields: [
      {
        type: 'text',
        name: 'cupon',
        validations: [{ kind: 'custom', ref: 'cuponValido' }],
      },
    ],
  });
  const options = {
    validators: {
      cuponValido: (v: unknown) =>
        v === 'OK' ? null : 'Cupón no válido',
    },
  };
  assert.equal(validateForm(schema, { cupon: 'OK' }, options).valid, true);
  assert.deepEqual(
    validateForm(schema, { cupon: 'NO' }, options).errors.cupon,
    ['Cupón no válido'],
  );
});
