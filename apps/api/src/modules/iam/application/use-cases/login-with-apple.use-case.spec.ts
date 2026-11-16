import { LoginWithAppleUseCase } from './login-with-apple.use-case';

describe('LoginWithAppleUseCase', () => {
  it('usa el nombre que manda la app (Apple no lo pone en el token)', async () => {
    const resolve = {
      execute: jest.fn().mockResolvedValue({ accessToken: 't' }),
    };
    const verifier = {
      verify: jest.fn().mockResolvedValue({
        providerId: 'apple-sub',
        email: 'ana@privaterelay.appleid.com',
        firstName: null,
        lastName: null,
        avatarUrl: null,
      }),
    };
    const useCase = new LoginWithAppleUseCase(verifier, resolve as never);
    await useCase.execute('jwt', { firstName: '  Ana ', lastName: '' });
    expect(resolve.execute).toHaveBeenCalledWith('apple', {
      providerId: 'apple-sub',
      email: 'ana@privaterelay.appleid.com',
      firstName: 'Ana',
      lastName: null,
      avatarUrl: null,
    });
  });
});
