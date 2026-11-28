import { describe, expect, it } from 'vitest';
import { startupNotice } from './ota-notices';

describe('aviso de versión nueva al abrir', () => {
  it('avisa solo si cambia la versión', () => {
    expect(startupNotice('de08a4d', '5d580db')).toEqual({ kind: 'updated', from: 'de08a4d', to: '5d580db' });
    expect(startupNotice('5d580db', '5d580db')).toEqual({ kind: 'none' });
  });

  it('no avisa en la primera apertura ni en desarrollo', () => {
    expect(startupNotice(null, '5d580db')).toEqual({ kind: 'none' });
    expect(startupNotice('5d580db', 'dev')).toEqual({ kind: 'none' });
  });
});
