import { CreateInvitationUseCase } from './create-invitation.use-case';
import { TooManyActiveInvitationsError } from '../../domain/errors/too-many-active-invitations.error';

describe('CreateInvitationUseCase', () => {
  let invitations: {
    create: jest.Mock;
    countActiveByUser: jest.Mock;
  };
  let useCase: CreateInvitationUseCase;

  beforeEach(() => {
    invitations = {
      create: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          id: 'inv-1',
          code: data.code,
          createdByUserId: data.createdByUserId,
          usedByUserId: null,
          expiresAt: data.expiresAt,
          createdAt: new Date(),
        }),
      ),
      countActiveByUser: jest.fn().mockResolvedValue(0),
    };
    useCase = new CreateInvitationUseCase(invitations as never);
  });

  it('crea una invitación con código y caducidad', async () => {
    const invitation = await useCase.execute({ createdByUserId: 'user-1' });

    expect(invitation.code).toHaveLength(8);
    expect(invitation.createdByUserId).toBe('user-1');
    expect(invitation.expiresAt).not.toBeNull();
    expect(invitations.create).toHaveBeenCalledTimes(1);
  });

  it('rechaza crear una nueva si ya se alcanzó el límite de activas', async () => {
    invitations.countActiveByUser.mockResolvedValue(5);

    await expect(useCase.execute({ createdByUserId: 'user-1' })).rejects.toThrow(
      TooManyActiveInvitationsError,
    );
    expect(invitations.create).not.toHaveBeenCalled();
  });
});
