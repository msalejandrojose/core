import { parseMetaWebhook } from './parse-meta-webhook';

const inboundPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { phone_number_id: 'PN1' },
            contacts: [{ wa_id: '34600111222', profile: { name: 'Ana' } }],
            messages: [
              {
                from: '34600111222',
                id: 'wamid.A',
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

const statusPayload = {
  entry: [
    {
      changes: [
        {
          value: {
            metadata: { phone_number_id: 'PN1' },
            statuses: [
              {
                id: 'wamid.OUT',
                status: 'delivered',
                timestamp: '1700000100',
                recipient_id: '34600111222',
              },
            ],
          },
        },
      ],
    },
  ],
};

describe('parseMetaWebhook', () => {
  it('extracts an inbound text message with contact name', () => {
    const { messages, statuses } = parseMetaWebhook(inboundPayload);
    expect(statuses).toHaveLength(0);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      phoneNumberId: 'PN1',
      from: '34600111222',
      contactName: 'Ana',
      waMessageId: 'wamid.A',
      body: 'Hola',
      timestamp: new Date(1700000000 * 1000),
    });
  });

  it('extracts a status update mapped to a known status', () => {
    const { messages, statuses } = parseMetaWebhook(statusPayload);
    expect(messages).toHaveLength(0);
    expect(statuses).toEqual([
      {
        phoneNumberId: 'PN1',
        waMessageId: 'wamid.OUT',
        status: 'delivered',
        timestamp: new Date(1700000100 * 1000),
      },
    ]);
  });

  it('renders non-text messages as a typed placeholder', () => {
    const { messages } = parseMetaWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: 'PN1' },
                messages: [
                  { from: '34600', id: 'wamid.IMG', type: 'image' },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(messages[0].body).toBe('[image]');
  });

  it('ignores unknown statuses and entries without a phone_number_id', () => {
    const { messages, statuses } = parseMetaWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: {},
                messages: [{ from: 'x', id: 'y', type: 'text', text: { body: 'z' } }],
              },
            },
            {
              value: {
                metadata: { phone_number_id: 'PN1' },
                statuses: [{ id: 'wamid.Z', status: 'deleted' }],
              },
            },
          ],
        },
      ],
    });
    expect(messages).toHaveLength(0);
    expect(statuses).toHaveLength(0);
  });

  it('returns empty lists for malformed payloads', () => {
    expect(parseMetaWebhook(null)).toEqual({ messages: [], statuses: [] });
    expect(parseMetaWebhook({})).toEqual({ messages: [], statuses: [] });
    expect(parseMetaWebhook({ entry: 'nope' })).toEqual({
      messages: [],
      statuses: [],
    });
  });
});
