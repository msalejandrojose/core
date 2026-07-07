import type { Validation } from '../types/validation.ts';

/**
 * Mensaje por defecto (en español) para cada validación cuando el schema no
 * declara uno explícito. Devuelve la `key` i18n / texto que el renderer puede
 * traducir o mostrar tal cual.
 */
export function defaultMessage(validation: Validation): string {
  switch (validation.kind) {
    case 'required':
      return 'Este campo es obligatorio';
    case 'minLength':
      return `Debe tener al menos ${validation.value} caracteres`;
    case 'maxLength':
      return `No puede superar los ${validation.value} caracteres`;
    case 'min':
      return `Debe ser como mínimo ${validation.value}`;
    case 'max':
      return `Debe ser como máximo ${validation.value}`;
    case 'pattern':
      return 'El formato no es válido';
    case 'email':
      return 'Email inválido';
    case 'url':
      return 'La URL no es válida';
    case 'integer':
      return 'Debe ser un número entero';
    case 'phone':
      return 'El teléfono no es válido';
    case 'iban':
      return 'El IBAN no es válido';
    case 'taxId':
      return 'El identificador fiscal no es válido';
    case 'creditCard':
      return 'El número de tarjeta no es válido';
    case 'custom':
      return 'Valor no válido';
    case 'async':
      return 'Valor no válido';
    default:
      return 'Valor no válido';
  }
}
