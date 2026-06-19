import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  enabledParts,
  getUrl,
  parseStackConfig,
  StackConfigError,
} from './loadStackConfig.ts';

const valid = {
  domains: { base: 'aj-local.es', localBase: 'aj-local.es' },
  parts: {
    api: { enabled: true, subdomain: 'api', internalPort: 3000, runMode: 'docker' },
    backoffice: { enabled: true, subdomain: 'admin', internalPort: 4200, runMode: 'host' },
    web: { enabled: false, subdomain: 'www', internalPort: 4300, runMode: 'host' },
    mobile: { enabled: false, subdomain: 'app', internalPort: 4400, runMode: 'host' },
  },
  environments: {
    local: { scheme: 'http', host: 'aj-local.es' },
    staging: { scheme: 'https', host: 'staging.aj-local.es' },
    prod: { scheme: 'https', host: 'aj.es' },
  },
};

test('parseStackConfig acepta una config válida', () => {
  const cfg = parseStackConfig(structuredClone(valid));
  assert.equal(cfg.parts.api.subdomain, 'api');
});

test('enabledParts devuelve solo las piezas activas', () => {
  const cfg = parseStackConfig(structuredClone(valid));
  assert.deepEqual(enabledParts(cfg), ['api', 'backoffice']);
});

test('getUrl compone la URL local sin puerto', () => {
  const cfg = parseStackConfig(structuredClone(valid));
  assert.equal(getUrl(cfg, 'api'), 'http://api.aj-local.es');
  assert.equal(getUrl(cfg, 'backoffice'), 'http://admin.aj-local.es');
});

test('getUrl usa el host del entorno en prod', () => {
  const cfg = parseStackConfig(structuredClone(valid));
  assert.equal(getUrl(cfg, 'api', 'prod'), 'https://api.aj.es');
});

test('parseStackConfig rechaza puerto fuera de rango', () => {
  const bad = structuredClone(valid);
  bad.parts.api.internalPort = 70000;
  assert.throws(() => parseStackConfig(bad), StackConfigError);
});

test('parseStackConfig rechaza si falta una pieza', () => {
  const bad = structuredClone(valid) as Record<string, unknown>;
  delete (bad.parts as Record<string, unknown>).mobile;
  assert.throws(() => parseStackConfig(bad), StackConfigError);
});

test('parseStackConfig rechaza runMode inválido', () => {
  const bad = structuredClone(valid);
  (bad.parts.api as { runMode: string }).runMode = 'k8s';
  assert.throws(() => parseStackConfig(bad), StackConfigError);
});
