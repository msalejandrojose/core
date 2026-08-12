/* eslint-disable @typescript-eslint/no-require-imports --
   `initialized` en `./sentry` es estado a nivel de módulo: cada test necesita
   una instancia fresca (`jest.isolateModules` + `require`), lo que impide usar
   el `import` estático de nivel de fichero. */
import * as Sentry from '@sentry/node';

jest.mock('@sentry/node', () => ({
  init: jest.fn(),
  withScope: jest.fn((callback: (scope: unknown) => void) =>
    callback({ setTag: jest.fn(), setUser: jest.fn(), setContext: jest.fn() }),
  ),
  captureException: jest.fn(),
}));

describe('sentry error tracking', () => {
  const originalDsn = process.env.SENTRY_DSN;

  afterEach(() => {
    jest.clearAllMocks();
    if (originalDsn === undefined) delete process.env.SENTRY_DSN;
    else process.env.SENTRY_DSN = originalDsn;
  });

  describe('sin SENTRY_DSN', () => {
    beforeEach(() => {
      delete process.env.SENTRY_DSN;
    });

    it('initSentry no inicializa el SDK', () => {
      jest.isolateModules(() => {
        const { initSentry } = require('./sentry') as typeof import('./sentry');
        initSentry();
      });
      expect(Sentry.init).not.toHaveBeenCalled();
    });

    it('captureException es un no-op', () => {
      jest.isolateModules(() => {
        const { initSentry, captureException } =
          require('./sentry') as typeof import('./sentry');
        initSentry();
        captureException(new Error('boom'), { errorId: 'e1', code: 'X' });
      });
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });

  describe('con SENTRY_DSN', () => {
    beforeEach(() => {
      process.env.SENTRY_DSN = 'https://public@sentry.example.com/1';
    });

    it('initSentry inicializa el SDK con el DSN y el entorno', () => {
      jest.isolateModules(() => {
        const { initSentry } = require('./sentry') as typeof import('./sentry');
        initSentry();
      });
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: process.env.SENTRY_DSN }),
      );
    });

    it('captureException reporta la excepción con el contexto de request', () => {
      const error = new Error('boom');
      jest.isolateModules(() => {
        const { initSentry, captureException } =
          require('./sentry') as typeof import('./sentry');
        initSentry();
        captureException(error, {
          errorId: 'e1',
          code: 'INTERNAL_UNEXPECTED',
          path: '/auth/login',
          method: 'POST',
          userId: 'u1',
          requestId: 'r1',
        });
      });
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
  });
});
