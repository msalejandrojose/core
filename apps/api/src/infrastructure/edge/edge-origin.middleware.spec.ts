import type { NextFunction, Request, Response } from 'express';
import {
  EDGE_CLIENT_IP_HEADER,
  EDGE_ORIGIN_AUTH_HEADER,
  edgeOriginMiddleware,
} from './edge-origin.middleware';

function makeReq(headers: Record<string, string> = {}, path = '/v1/foo') {
  return { headers, path, ip: '10.0.0.1' } as unknown as Request;
}

function makeRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}

describe('edgeOriginMiddleware', () => {
  const secret = 's3cret-value';

  it('no hace nada sin secreto configurado', () => {
    const next: NextFunction = jest.fn();
    const req = makeReq({ [EDGE_CLIENT_IP_HEADER]: '1.2.3.4' });
    edgeOriginMiddleware({ enforce: true })(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.ip).toBe('10.0.0.1');
  });

  it('con el secreto correcto usa la IP real del cliente', () => {
    const next: NextFunction = jest.fn();
    const req = makeReq({
      [EDGE_ORIGIN_AUTH_HEADER]: secret,
      [EDGE_CLIENT_IP_HEADER]: '1.2.3.4',
    });
    edgeOriginMiddleware({ secret, enforce: true })(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.ip).toBe('1.2.3.4');
  });

  it('sin enforce deja pasar peticiones directas sin tocar la IP', () => {
    const next: NextFunction = jest.fn();
    const req = makeReq({ [EDGE_CLIENT_IP_HEADER]: '1.2.3.4' });
    edgeOriginMiddleware({ secret })(req, makeRes(), next);
    expect(next).toHaveBeenCalled();
    expect(req.ip).toBe('10.0.0.1');
  });

  it('con enforce rechaza un secreto incorrecto', () => {
    const next: NextFunction = jest.fn();
    const res = makeRes();
    const req = makeReq({ [EDGE_ORIGIN_AUTH_HEADER]: 'nope' });
    edgeOriginMiddleware({ secret, enforce: true })(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('con enforce deja pasar los health checks', () => {
    const next: NextFunction = jest.fn();
    edgeOriginMiddleware({ secret, enforce: true })(
      makeReq({}, '/health'),
      makeRes(),
      next,
    );
    expect(next).toHaveBeenCalled();
  });
});
