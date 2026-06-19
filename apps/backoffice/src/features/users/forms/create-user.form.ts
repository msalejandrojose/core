import { defineForm, type InferFormValues } from '@core/forms';

/**
 * Schema declarativo del formulario de alta de usuario. Primer caso real que
 * valida el diseño de `@core/forms`: campos de texto, email, password, un
 * selector y un grupo de dos columnas, todo con validaciones del catálogo.
 */
export const createUserForm = defineForm({
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
      type: 'select',
      name: 'userType',
      label: 'Tipo',
      defaultValue: 'BACKOFFICE',
      validations: [{ kind: 'required' }],
      options: [
        { value: 'BACKOFFICE', label: 'BACKOFFICE' },
        { value: 'APP', label: 'APP' },
      ],
    },
    {
      type: 'group',
      columns: 2,
      fields: [
        {
          type: 'text',
          name: 'firstName',
          label: 'Nombre',
          validations: [{ kind: 'maxLength', value: 100 }],
        },
        {
          type: 'text',
          name: 'lastName',
          label: 'Apellido',
          validations: [{ kind: 'maxLength', value: 100 }],
        },
      ],
    },
  ],
});

export type CreateUserFormValues = InferFormValues<typeof createUserForm>;
