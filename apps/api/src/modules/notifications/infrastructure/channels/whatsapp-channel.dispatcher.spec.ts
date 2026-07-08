import { WhatsappChannelDispatcher } from './whatsapp-channel.dispatcher';
import type {
  DispatchAccount,
  RenderedMessage,
} from '../../application/ports/channel-dispatcher.port';

const account = (config: Record<string, unknown>): DispatchAccount => ({
  id: 'acc-1',
  name: 'WA Principal',
  channel: 'WHATSAPP',
  config,
});

const message: RenderedMessage = {
  to: '34600111222',
  content: { body: 'Hola 👋' },
};

const fullConfig = {
  provider: 'meta',
  phoneNumberId: 'PNID',
  accessToken: 'TOKEN',
  apiVersion: 'v21.0',
};

describe('WhatsappChannelDispatcher', () => {
  let dispatcher: WhatsappChannelDispatcher;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    dispatcher = new WhatsappChannelDispatcher();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('envía por la Cloud API de Meta y devuelve el wamid', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'wamid.abc' }] }),
    });

    const result = await dispatcher.dispatch(account(fullConfig), message);

    expect(result).toEqual({ providerMessageId: 'wamid.abc' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://graph.facebook.com/v21.0/PNID/messages');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer TOKEN',
    );
    expect(JSON.parse(init.body as string)).toMatchObject({
      messaging_product: 'whatsapp',
      to: '34600111222',
      type: 'text',
      text: { body: 'Hola 👋' },
    });
  });

  it('usa la versión de API por defecto cuando no se configura', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'wamid.x' }] }),
    });

    await dispatcher.dispatch(
      account({ ...fullConfig, apiVersion: undefined }),
      message,
    );

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('/v21.0/');
  });

  it('sin credenciales: no llama a Meta y devuelve vacío (stub dev/CI)', async () => {
    const result = await dispatcher.dispatch(
      account({ provider: 'meta' }),
      message,
    );

    expect(result).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('error de la API: lanza con el mensaje del proveedor', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      json: () =>
        Promise.resolve({ error: { message: 'Invalid OAuth access token' } }),
    });

    await expect(
      dispatcher.dispatch(account(fullConfig), message),
    ).rejects.toThrow('Invalid OAuth access token');
  });

  it('envía una plantilla con idioma y variables cuando hay templateName', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'wamid.tpl' }] }),
    });

    const result = await dispatcher.dispatch(account(fullConfig), {
      to: '34600111222',
      content: {
        templateName: 'bienvenida',
        templateLanguage: 'es_ES',
        templateParams: 'Ana\n02001',
      },
    });

    expect(result).toEqual({ providerMessageId: 'wamid.tpl' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({
      to: '34600111222',
      type: 'template',
      template: {
        name: 'bienvenida',
        language: { code: 'es_ES' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: 'Ana' },
              { type: 'text', text: '02001' },
            ],
          },
        ],
      },
    });
  });

  it('plantilla sin idioma: usa es_ES por defecto y omite components sin variables', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'wamid.x' }] }),
    });

    await dispatcher.dispatch(account(fullConfig), {
      to: '34600111222',
      content: { templateName: 'recordatorio' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sent = JSON.parse(init.body as string);
    expect(sent.template.language.code).toBe('es_ES');
    expect(sent.template.components).toBeUndefined();
  });
});
