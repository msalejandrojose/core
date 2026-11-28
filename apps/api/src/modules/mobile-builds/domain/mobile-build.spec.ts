import { buildState, cleanLaunch, parseRunTitle } from './mobile-build';
import { InvalidMobileBuildError } from './mobile-builds.errors';

describe('mobile-build', () => {
  const base = { platform: 'ios', profile: 'device', defaultRef: 'brio-dev' };

  describe('cleanLaunch', () => {
    it('rellena la rama por defecto y limpia el móvil', () => {
      expect(
        cleanLaunch({ ...base, device: '  iPhone de Alejandro Jose ' }),
      ).toEqual({
        platform: 'ios',
        profile: 'device',
        device: 'iPhone de Alejandro Jose',
        buildNumber: null,
        ref: 'brio-dev',
      });
      expect(cleanLaunch({ ...base, device: '', ref: '  ' }).device).toBeNull();
    });

    it('acepta ip:puerto de adb y una rama de tarea', () => {
      const b = cleanLaunch({
        ...base,
        platform: 'android',
        device: '192.168.1.20:37155',
        ref: 'brio-dev--builds',
      });
      expect(b.device).toBe('192.168.1.20:37155');
      expect(b.ref).toBe('brio-dev--builds');
    });

    it.each([
      [{ platform: 'windows' }, /plataforma/],
      [{ profile: 'beta' }, /perfil/],
      [{ device: 'iPhone"; rm -rf ~' }, /móvil/],
      [{ ref: '../main' }, /rama/],
      [{ ref: '-x' }, /rama/],
      [{ ref: 'a b' }, /rama/],
      [{ buildNumber: 0 }, /número de build/],
      [{ buildNumber: 1.5 }, /número de build/],
    ])('rechaza %j', (patch, message) => {
      expect(() => cleanLaunch({ ...base, ...patch })).toThrow(
        InvalidMobileBuildError,
      );
      expect(() => cleanLaunch({ ...base, ...patch })).toThrow(message);
    });
  });

  it('buildState', () => {
    expect(buildState('queued', null)).toBe('QUEUED');
    expect(buildState('waiting', null)).toBe('QUEUED');
    expect(buildState('in_progress', null)).toBe('RUNNING');
    expect(buildState('completed', 'success')).toBe('SUCCESS');
    expect(buildState('completed', 'cancelled')).toBe('CANCELLED');
    expect(buildState('completed', 'failure')).toBe('FAILED');
    expect(buildState('completed', 'timed_out')).toBe('FAILED');
  });

  it('parseRunTitle', () => {
    expect(parseRunTitle('ios · device · iPhone de Alejandro Jose')).toEqual({
      platform: 'ios',
      profile: 'device',
      device: 'iPhone de Alejandro Jose',
    });
    expect(parseRunTitle('android · testflight')).toEqual({
      platform: 'android',
      profile: 'testflight',
      device: null,
    });
    // Runs que no salen del workflow_dispatch (p. ej. la prueba por push).
    expect(parseRunTitle(' · ')).toEqual({
      platform: null,
      profile: null,
      device: null,
    });
  });
});
