import { RedeemInvitationUseCase } from './redeem-invitation.use-case';
import { InvalidInvitationCodeError } from '../../domain/errors/invalid-invitation-code.error';
import { Invitation } from '../../domain/entities/invitation.entity';

function makeInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: 'inv-1',
    code: 'ABCD2345',
    createdByUserId: 'user-1',
    usedByUserId: null,
    expiresAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe('RedeemInvitationUseCase', () => {
  let invitations: { findByCode: jest.Mock; markAsUsed: jest.Mock };
  let userRegistrar: { registerAppUser: jest.Mock };
  let useCase: RedeemInvitationUseCase;

  beforeEach(() => {
    invitations = {
      findByCode: jest.fn().mockResolvedValue(makeInvitation()),
      markAsUsed: jest.fn().mockResolvedValue(undefined),
    };
    userRegistrar = {
      registerAppUser: jest.fn().mockResolvedValue({ id: 'user-2' }),
    };
    useCase = new RedeemInvitationUseCase(
      invitations as never,
      userRegistrar as never,
    );
  });

  it('registra la cuenta y marca la invitación como usada', async () => {
    const result = await useCase.execute({
      code: 'abcd2345',
      email: 'user@example.com',
      password: 'supersecret',
    });

    expect(userRegistrar.registerAppUser).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'supersecret',
      firstName: undefined,
      lastName: undefined,
    });
    expect(invitations.markAsUsed).toHaveBeenCalledWith('inv-1', 'user-2');
    expect(result).toEqual({ userId: 'user-2' });
  });

  it('normaliza el código a mayúsculas antes de buscarlo', async () => {
    await useCase.execute({
      code: '  abcd2345  ',
      email: 'user@example.com',
      password: 'supersecret',
    });

    expect(invitations.findByCode).toHaveBeenCalledWith('ABCD2345');
  });

  it('rechaza un código que no existe', async () => {
    invitations.findByCode.mockResolvedValue(null);

    await expect(
      useCase.execute({
        code: 'NOPE0000',
        email: 'user@example.com',
        password: 'supersecret',
      }),
    ).rejects.toThrow(InvalidInvitationCodeError);
    expect(userRegistrar.registerAppUser).not.toHaveBeenCalled();
  });

  it('rechaza un código ya usado', async () => {
    invitations.findByCode.mockResolvedValue(
      makeInvitation({ usedByUserId: 'someone-else' }),
    );

    await expect(
      useCase.execute({
        code: 'ABCD2345',
        email: 'user@example.com',
        password: 'supersecret',
      }),
    ).rejects.toThrow(InvalidInvitationCodeError);
  });

  it('rechaza un código caducado', async () => {
    invitations.findByCode.mockResolvedValue(
      makeInvitation({ expiresAt: new Date('2000-01-01') }),
    );

    await expect(
      useCase.execute({
        code: 'ABCD2345',
        email: 'user@example.com',
        password: 'supersecret',
      }),
    ).rejects.toThrow(InvalidInvitationCodeError);
  });
});
