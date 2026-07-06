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
import type { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';
import { SendNotificationUseCase } from './send-notification.use-case';

interface DeliveriesMock {
  create: jest.Mock;
  update: jest.Mock;
  findById: jest.Mock;
  findByProviderMessageId: jest.Mock;
  list: jest.Mock;
}

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

function buildDelivery(
  overrides: Partial<NotificationDelivery> = {},
): NotificationDelivery {
  const now = new Date();
  return {
    id: 'del1',
    messageTypeId: 'mt1',
    messageTypeKey: 'welcome_email',
    accountId: 'acc1',
    channel: 'EMAIL',
    provider: 'resend',
    toAddress: 'user@x.com',
    subject: null,
    status: 'pending',
    providerMessageId: null,
    error: null,
    events: [],
    sentAt: null,
    deliveredAt: null,
    lastEventAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('SendNotificationUseCase', () => {
  let repo: jest.Mocked<MessageTypeRepositoryPort>;
  let dispatch: jest.Mock;
  let registry: ChannelDispatcherRegistryPort;
  let deliveries: DeliveriesMock;
  let useCase: SendNotificationUseCase;

  beforeEach(() => {
    repo = {
      findByKey: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<MessageTypeRepositoryPort>;
    dispatch = jest.fn().mockResolvedValue({ providerMessageId: 'prov-1' });
    const dispatcher: ChannelDispatcherPort = { channel: 'EMAIL', dispatch };
    registry = { get: jest.fn().mockReturnValue(dispatcher) };
    deliveries = {
      create: jest.fn().mockResolvedValue(buildDelivery()),
      update: jest.fn().mockResolvedValue(buildDelivery()),
      findById: jest.fn(),
      findByProviderMessageId: jest.fn(),
      list: jest.fn(),
    };
    useCase = new SendNotificationUseCase(
      repo,
      registry,
      new NullSecretCipher(),
      deliveries,
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

  it('registra la delivery (pending → sent) y correlaciona el providerMessageId', async () => {
    repo.findByKey.mockResolvedValue(buildMessageType());
    const result = await useCase.executeByKey('welcome_email', {
      to: 'user@x.com',
      variables: { firstName: 'Ana' },
    });

    expect(deliveries.create).toHaveBeenCalledWith(
      expect.objectContaining({
        messageTypeKey: 'welcome_email',
        channel: 'EMAIL',
        toAddress: 'user@x.com',
        status: 'pending',
      }),
    );
    // el deliveryId se pasa al dispatcher (para el custom_arg del webhook)
    const dispatchArgs = dispatch.mock.calls[0] as [
      unknown,
      unknown,
      { deliveryId?: string },
    ];
    expect(dispatchArgs[2]).toEqual({ deliveryId: 'del1' });
    // se marca como enviada con el id del proveedor
    expect(deliveries.update).toHaveBeenCalledWith(
      'del1',
      expect.objectContaining({ status: 'sent', providerMessageId: 'prov-1' }),
    );
    expect(result.deliveryId).toBe('del1');
  });

  it('marca la delivery como fallida si el dispatcher falla', async () => {
    repo.findByKey.mockResolvedValue(buildMessageType());
    dispatch.mockRejectedValue(new Error('boom'));
    await expect(
      useCase.executeByKey('welcome_email', {
        to: 'user@x.com',
        variables: { firstName: 'Ana' },
      }),
    ).rejects.toBeInstanceOf(NotificationDeliveryError);
    expect(deliveries.update).toHaveBeenCalledWith(
      'del1',
      expect.objectContaining({ status: 'failed', error: 'boom' }),
    );
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
