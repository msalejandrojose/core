import { IngestInboundWebhookUseCase } from './ingest-inbound-webhook.use-case';
import type { WhatsappAccountResolverPort } from '../ports/whatsapp-account-resolver.port';
import type { WhatsappMessageRepositoryPort } from '../ports/whatsapp-message-repository.port';
import type { WhatsappRealtimePort } from '../ports/whatsapp-realtime.port';
import type { RecordWhatsappMessageService } from '../services/record-whatsapp-message.service';

function payloadWithMessage(waMessageId: string, phoneNumberId = 'PN1') {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              metadata: { phone_number_id: phoneNumberId },
              contacts: [{ wa_id: '34600', profile: { name: 'Ana' } }],
              messages: [
                {
                  from: '34600',
                  id: waMessageId,
                  timestamp: '1700000000',
                  type: 'text',
                  text: { body: 'Hola' },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

describe('IngestInboundWebhookUseCase', () => {
  let accounts: jest.Mocked<WhatsappAccountResolverPort>;
  let messages: jest.Mocked<WhatsappMessageRepositoryPort>;
  let realtime: jest.Mocked<WhatsappRealtimePort>;
  let recorder: jest.Mocked<Pick<RecordWhatsappMessageService, 'record'>>;
  let useCase: IngestInboundWebhookUseCase;

  beforeEach(() => {
    accounts = {
      resolveByPhoneNumberId: jest.fn(),
      getById: jest.fn(),
      listAccounts: jest.fn(),
    };
    messages = {
      create: jest.fn(),
      existsByWaMessageId: jest.fn(),
      listByConversation: jest.fn(),
      updateStatusByWaMessageId: jest.fn(),
    };
    realtime = { broadcastMessage: jest.fn(), broadcastStatus: jest.fn() };
    recorder = { record: jest.fn().mockResolvedValue({}) };
    useCase = new IngestInboundWebhookUseCase(
      accounts,
      messages,
      realtime,
      recorder as unknown as RecordWhatsappMessageService,
    );
  });

  it('records a new inbound message from a known account', async () => {
    accounts.resolveByPhoneNumberId.mockResolvedValue({
      id: 'acc-1',
      name: 'Negocio',
      config: {},
    });
    messages.existsByWaMessageId.mockResolvedValue(false);

    const result = await useCase.execute(payloadWithMessage('wamid.A'));

    expect(recorder.record).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'acc-1',
        contactPhone: '34600',
        direction: 'INBOUND',
        waMessageId: 'wamid.A',
        status: 'received',
      }),
    );
    expect(result).toEqual({ messages: 1, statuses: 0, skipped: 0 });
  });

  it('skips a message whose phone_number_id has no account', async () => {
    accounts.resolveByPhoneNumberId.mockResolvedValue(null);

    const result = await useCase.execute(payloadWithMessage('wamid.A'));

    expect(recorder.record).not.toHaveBeenCalled();
    expect(result).toEqual({ messages: 0, statuses: 0, skipped: 1 });
  });

  it('deduplicates a message already stored by wamid', async () => {
    accounts.resolveByPhoneNumberId.mockResolvedValue({
      id: 'acc-1',
      name: 'Negocio',
      config: {},
    });
    messages.existsByWaMessageId.mockResolvedValue(true);

    const result = await useCase.execute(payloadWithMessage('wamid.A'));

    expect(recorder.record).not.toHaveBeenCalled();
    expect(result).toEqual({ messages: 0, statuses: 0, skipped: 1 });
  });

  it('applies a status update and broadcasts it', async () => {
    messages.updateStatusByWaMessageId.mockResolvedValue({
      id: 'm1',
      conversationId: 'c1',
      direction: 'OUTBOUND',
      waMessageId: 'wamid.OUT',
      body: 'Hi',
      status: 'delivered',
      timestamp: new Date(),
      createdAt: new Date(),
    });

    const result = await useCase.execute({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'PN1' },
                statuses: [
                  { id: 'wamid.OUT', status: 'delivered', timestamp: '1700000100' },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(realtime.broadcastStatus).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 'c1' }),
    );
    expect(result).toEqual({ messages: 0, statuses: 1, skipped: 0 });
  });
});
