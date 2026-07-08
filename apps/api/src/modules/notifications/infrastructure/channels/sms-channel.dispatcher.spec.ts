import { SmsChannelDispatcher } from './sms-channel.dispatcher';
import type {
  DispatchAccount,
  RenderedMessage,
} from '../../application/ports/channel-dispatcher.port';

const account = (config: Record<string, unknown>): DispatchAccount => ({
  id: 'acc-1',
  name: 'SMS Principal',
  channel: 'SMS',
  config,
});

const message: RenderedMessage = {
  to: '+34600111222',
  content: { body: 'Tu código es 1234' },
};

const fullConfig = {
  provider: 'twilio',
  accountSid: 'ACxxxx',
  authToken: 'TOKEN',
  fromNumber: '+34611000000',
};

describe('SmsChannelDispatcher', () => {
  let dispatcher: SmsChannelDispatcher;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    dispatcher = new SmsChannelDispatcher();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('envía por la REST API de Twilio y devuelve el sid', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: 'SM123' }),
    });

    const result = await dispatcher.dispatch(account(fullConfig), message);

    expect(result).toEqual({ providerMessageId: 'SM123' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.twilio.com/2010-04-01/Accounts/ACxxxx/Messages.json',
    );
    expect((init.headers as Record<string, string>).Authorization).toBe(
      `Basic ${Buffer.from('ACxxxx:TOKEN').toString('base64')}`,
    );
    const params = new URLSearchParams(init.body as string);
    expect(params.get('To')).toBe('+34600111222');
    expect(params.get('From')).toBe('+34611000000');
    expect(params.get('Body')).toBe('Tu código es 1234');
  });

  it('sin credenciales: no llama a Twilio y devuelve vacío (stub dev/CI)', async () => {
    const result = await dispatcher.dispatch(
      account({ provider: 'twilio' }),
      message,
    );

    expect(result).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('error de la API: lanza con el mensaje del proveedor', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ message: "The 'To' number is not a valid phone" }),
    });

    await expect(
      dispatcher.dispatch(account(fullConfig), message),
    ).rejects.toThrow("The 'To' number is not a valid phone");
  });
});
