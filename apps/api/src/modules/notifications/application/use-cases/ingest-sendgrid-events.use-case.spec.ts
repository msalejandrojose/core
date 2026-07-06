import type { NotificationDelivery } from '../../domain/entities/notification-delivery.entity';
import { IngestSendgridEventsUseCase } from './ingest-sendgrid-events.use-case';

interface DeliveriesMock {
  create: jest.Mock;
  update: jest.Mock;
  findById: jest.Mock;
  findByProviderMessageId: jest.Mock;
  list: jest.Mock;
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
    provider: 'sendgrid',
    toAddress: 'user@x.com',
    subject: null,
    status: 'sent',
    providerMessageId: 'abc123',
    error: null,
    events: [],
    sentAt: now,
    deliveredAt: null,
    lastEventAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('IngestSendgridEventsUseCase', () => {
  let deliveries: DeliveriesMock;
  let useCase: IngestSendgridEventsUseCase;

  beforeEach(() => {
    deliveries = {
      create: jest.fn(),
      update: jest.fn().mockResolvedValue(buildDelivery()),
      findById: jest.fn(),
      findByProviderMessageId: jest.fn(),
      list: jest.fn(),
    };
    useCase = new IngestSendgridEventsUseCase(deliveries);
  });

  it('correlaciona por deliveryId y actualiza estado + timestamps', async () => {
    deliveries.findById.mockResolvedValue(buildDelivery());
    const ts = 1_700_000_000;
    const result = await useCase.execute([
      { event: 'delivered', deliveryId: 'del1', timestamp: ts },
    ]);

    expect(deliveries.findById).toHaveBeenCalledWith('del1');
    expect(deliveries.update).toHaveBeenCalledWith(
      'del1',
      expect.objectContaining({
        status: 'delivered',
        deliveredAt: new Date(ts * 1000),
      }),
    );
    expect(result).toEqual({ received: 1, applied: 1, unmatched: 0 });
  });

  it('correlaciona por prefijo de sg_message_id cuando no hay deliveryId', async () => {
    deliveries.findByProviderMessageId.mockResolvedValue(buildDelivery());
    await useCase.execute([{ event: 'open', sg_message_id: 'abc123.recvV3' }]);

    expect(deliveries.findByProviderMessageId).toHaveBeenCalledWith(
      'sendgrid',
      'abc123',
    );
    expect(deliveries.update).toHaveBeenCalledWith(
      'del1',
      expect.objectContaining({ status: 'opened' }),
    );
  });

  it('guarda el motivo del bounce como error', async () => {
    deliveries.findById.mockResolvedValue(buildDelivery());
    await useCase.execute([
      { event: 'bounce', deliveryId: 'del1', reason: 'mailbox full' },
    ]);
    expect(deliveries.update).toHaveBeenCalledWith(
      'del1',
      expect.objectContaining({ status: 'bounced', error: 'mailbox full' }),
    );
  });

  it('ignora eventos sin estado mapeable y los no correlacionados', async () => {
    deliveries.findById.mockResolvedValue(null);
    const result = await useCase.execute([
      { event: 'group_resubscribe', deliveryId: 'del1' }, // sin estado
      { event: 'delivered', deliveryId: 'desconocida' }, // sin delivery
    ]);
    expect(deliveries.update).not.toHaveBeenCalled();
    expect(result).toEqual({ received: 2, applied: 0, unmatched: 1 });
  });
});
