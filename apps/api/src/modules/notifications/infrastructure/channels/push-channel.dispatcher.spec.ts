import { PushChannelDispatcher } from './push-channel.dispatcher';
import type {
  DispatchAccount,
  RenderedMessage,
} from '../../application/ports/channel-dispatcher.port';

const account = (config: Record<string, unknown>): DispatchAccount => ({
  id: 'acc-1',
  name: 'Push Principal',
  channel: 'PUSH',
  config,
});

const message: RenderedMessage = {
  to: 'device-token-abc',
  content: { title: 'Nuevo pedido', body: 'Tienes un pedido', deepLink: '/orders/1' },
};

const fullConfig = { provider: 'fcm', serverKey: 'SERVER_KEY' };

describe('PushChannelDispatcher', () => {
  let dispatcher: PushChannelDispatcher;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    dispatcher = new PushChannelDispatcher();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('envía por FCM y devuelve el message_id', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ failure: 0, results: [{ message_id: 'fcm-1' }] }),
    });

    const result = await dispatcher.dispatch(account(fullConfig), message);

    expect(result).toEqual({ providerMessageId: 'fcm-1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://fcm.googleapis.com/fcm/send');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'key=SERVER_KEY',
    );
    expect(JSON.parse(init.body as string)).toMatchObject({
      to: 'device-token-abc',
      notification: { title: 'Nuevo pedido', body: 'Tienes un pedido' },
      data: { deepLink: '/orders/1' },
    });
  });

  it('omite data cuando no hay deepLink', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [{ message_id: 'fcm-2' }] }),
    });

    await dispatcher.dispatch(account(fullConfig), {
      to: 'tok',
      content: { title: 'Hola', body: 'Mundo' },
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).data).toBeUndefined();
  });

  it('sin serverKey: no llama a FCM y devuelve vacío (stub dev/CI)', async () => {
    const result = await dispatcher.dispatch(
      account({ provider: 'fcm' }),
      message,
    );

    expect(result).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('error por token inválido (200 con results[0].error): lanza', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ failure: 1, results: [{ error: 'NotRegistered' }] }),
    });

    await expect(
      dispatcher.dispatch(account(fullConfig), message),
    ).rejects.toThrow('NotRegistered');
  });

  it('error HTTP: lanza con el detalle', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: 'Unauthorized' }),
    });

    await expect(
      dispatcher.dispatch(account(fullConfig), message),
    ).rejects.toThrow('Unauthorized');
  });
});
