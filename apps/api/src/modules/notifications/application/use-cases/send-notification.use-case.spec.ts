import type { MessageType } from '../../domain/entities/message-type.entity';
import { ChannelNotSupportedError } from '../../domain/errors/channel-not-supported.error';
import { MessageTypeNotFoundError } from '../../domain/errors/message-type-not-found.error';
import { NotificationDeliveryError } from '../../domain/errors/notification-delivery.error';
import { NullSecretCipher } from '../../infrastructure/crypto/null-secret-cipher';
import type {
  ChannelDispatcherPort,
  DispatchAccount,
  RenderedMessage,
} from '../ports/channel-dispatcher.port';
import type { ChannelDispatcherRegistryPort } from '../ports/channel-dispatcher-registry.port';
import type { MessageTypeRepositoryPort } from '../ports/message-type-repository.port';
import { SendNotificationUseCase } from './send-notification.use-case';

function buildMessageType(overrides: Partial<MessageType> = {}): MessageType {
  const now = new Date();
  return {
    id: 'mt1',
    key: 'welcome_email',
    name: 'Welcome',
    accountId: 'acc1',
    content: {
      subject: 'Hola {{ firstName }}',
      html: '<p>{{ firstName }}</p>',
    },
    isActive: true,
    createdAt: now,
    updatedAt: now,
    account: {
      id: 'acc1',
      typeId: 'type1',
      name: 'Resend dev',
      config: { provider: 'resend', fromEmail: 'a@b.com' },
      isActive: true,
      isDefault: true,
      createdAt: now,
      updatedAt: now,
      type: {
        id: 'type1',
        key: 'email',
        name: 'Email',
        channel: 'EMAIL',
        configSchema: [],
        messageSchema: [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    },
    ...overrides,
  };
}

describe('SendNotificationUseCase', () => {
  let repo: jest.Mocked<MessageTypeRepositoryPort>;
  let dispatch: jest.Mock;
  let registry: ChannelDispatcherRegistryPort;
  let useCase: SendNotificationUseCase;

  beforeEach(() => {
    repo = {
      findByKey: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<MessageTypeRepositoryPort>;
    dispatch = jest.fn().mockResolvedValue(undefined);
    const dispatcher: ChannelDispatcherPort = { channel: 'EMAIL', dispatch };
    registry = { get: jest.fn().mockReturnValue(dispatcher) };
    useCase = new SendNotificationUseCase(
      repo,
      registry,
      new NullSecretCipher(),
    );
  });

  it('lanza not-found si no existe el tipo de mensaje', async () => {
    repo.findByKey.mockResolvedValue(null);
    await expect(
      useCase.executeByKey('nope', { to: 'x@y.com' }),
    ).rejects.toBeInstanceOf(MessageTypeNotFoundError);
  });

  it('renderiza el contenido y despacha en un envío real', async () => {
    repo.findByKey.mockResolvedValue(buildMessageType());
    const result = await useCase.executeByKey('welcome_email', {
      to: 'user@x.com',
      variables: { firstName: 'Ana' },
    });

    expect(result.sent).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.channel).toBe('EMAIL');
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [account, message] = dispatch.mock.calls[0] as [
      DispatchAccount,
      RenderedMessage,
    ];
    expect(account.channel).toBe('EMAIL');
    expect(message.to).toBe('user@x.com');
    expect(message.content).toEqual({
      subject: 'Hola Ana',
      html: '<p>Ana</p>',
    });
  });

  it('en dryRun renderiza y valida pero NO despacha', async () => {
    repo.findByKey.mockResolvedValue(buildMessageType());
    const result = await useCase.executeByKey('welcome_email', {
      to: 'user@x.com',
      variables: { firstName: 'Ana' },
      dryRun: true,
    });

    expect(result.sent).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(result.rendered).toEqual({
      subject: 'Hola Ana',
      html: '<p>Ana</p>',
    });
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('compila el template de bloques a html/text en el envío', async () => {
    repo.findByKey.mockResolvedValue(
      buildMessageType({
        content: {
          subject: 'Hola {{ firstName }}',
          template: {
            blocks: [
              { type: 'heading', props: { text: 'Hola {{ firstName }}' } },
            ],
          },
        },
      }),
    );
    const result = await useCase.executeByKey('welcome_email', {
      to: 'user@x.com',
      variables: { firstName: 'Ana' },
    });

    expect(result.sent).toBe(true);
    const [, message] = dispatch.mock.calls[0] as [unknown, RenderedMessage];
    const html = message.content.html as string;
    expect(html).toContain('<table');
    expect(html).toContain('Hola Ana');
    expect(html).not.toContain('{{');
    expect(message.content.text).toContain('Hola Ana');
  });

  it('omite (skip) si el tipo de mensaje está inactivo', async () => {
    repo.findByKey.mockResolvedValue(buildMessageType({ isActive: false }));
    const result = await useCase.executeByKey('welcome_email', {
      to: 'x@y.com',
    });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe('inactive');
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('lanza channel-not-supported si no hay dispatcher', async () => {
    repo.findByKey.mockResolvedValue(buildMessageType());
    (registry.get as jest.Mock).mockReturnValue(null);
    await expect(
      useCase.executeByKey('welcome_email', {
        to: 'x@y.com',
        variables: { firstName: 'A' },
      }),
    ).rejects.toBeInstanceOf(ChannelNotSupportedError);
  });

  it('envuelve los fallos del dispatcher en NotificationDeliveryError', async () => {
    repo.findByKey.mockResolvedValue(buildMessageType());
    dispatch.mockRejectedValue(new Error('boom'));
    await expect(
      useCase.executeByKey('welcome_email', {
        to: 'x@y.com',
        variables: { firstName: 'A' },
      }),
    ).rejects.toBeInstanceOf(NotificationDeliveryError);
  });
});
