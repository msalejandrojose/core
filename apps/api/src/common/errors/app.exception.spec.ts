import { HttpStatus } from '@nestjs/common';
import { AppException, normalizeUnknownError } from './app.exception';

describe('AppException', () => {
  it('resuelve httpStatus/level/message desde el catálogo', () => {
    const ex = new AppException('USER_NOT_FOUND');
    expect(ex.code).toBe('USER_NOT_FOUND');
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(ex.level).toBe('warn');
    expect(ex.message).toBe('Usuario no encontrado.');
  });

  it('permite override del mensaje y contexto', () => {
    const ex = new AppException('USER_EMAIL_ALREADY_EXISTS', {
      message: 'Custom',
      context: { email: 'x@y.z' },
    });
    expect(ex.message).toBe('Custom');
    expect(ex.context).toEqual({ email: 'x@y.z' });
  });

  it('genera un errorId único por instancia', () => {
    const a = new AppException('USER_NOT_FOUND');
    const b = new AppException('USER_NOT_FOUND');
    expect(a.errorId).not.toBe(b.errorId);
    expect(a.errorId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe('normalizeUnknownError', () => {
  it('devuelve la AppException tal cual si ya lo es', () => {
    const ex = new AppException('USER_NOT_FOUND');
    expect(normalizeUnknownError(ex)).toBe(ex);
  });

  it('envuelve Error como INTERNAL_UNEXPECTED', () => {
    const wrapped = normalizeUnknownError(new Error('boom'));
    expect(wrapped.code).toBe('INTERNAL_UNEXPECTED');
    expect(wrapped.level).toBe('critical');
    expect(wrapped.message).toBe('boom');
  });

  it('envuelve valores no-Error con mensaje genérico', () => {
    const wrapped = normalizeUnknownError('weird');
    expect(wrapped.code).toBe('INTERNAL_UNEXPECTED');
    expect(wrapped.message).toBe('Unknown error');
  });
});
