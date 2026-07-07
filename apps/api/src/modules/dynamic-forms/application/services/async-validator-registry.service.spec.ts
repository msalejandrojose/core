import { AsyncValidatorNotFoundError } from '../../domain/errors/async-validator-not-found.error';
import {
  type AsyncValidationResult,
  type AsyncValidator,
} from '../ports/async-validator.port';
import { AsyncValidatorRegistry } from './async-validator-registry.service';

function fakeValidator(ref: string): AsyncValidator {
  return {
    ref,
    validate: (): Promise<AsyncValidationResult> =>
      Promise.resolve({ valid: true }),
  };
}

describe('AsyncValidatorRegistry', () => {
  it('indexa por ref y los lista ordenados', () => {
    const registry = new AsyncValidatorRegistry([
      fakeValidator('email-available'),
      fakeValidator('username-available'),
    ]);
    expect(registry.refs()).toEqual(['email-available', 'username-available']);
    expect(registry.get('email-available').ref).toBe('email-available');
  });

  it('lanza AsyncValidatorNotFoundError si el ref no existe', () => {
    const registry = new AsyncValidatorRegistry([fakeValidator('x')]);
    expect(() => registry.get('nope')).toThrow(AsyncValidatorNotFoundError);
  });

  it('tolera cero validadores', () => {
    expect(new AsyncValidatorRegistry().refs()).toEqual([]);
  });
});
