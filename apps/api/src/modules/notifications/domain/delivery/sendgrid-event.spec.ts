import {
  providerMessageIdFromEvent,
  sendgridEventToStatus,
} from './sendgrid-event';

describe('sendgridEventToStatus', () => {
  it('mapea los eventos conocidos', () => {
    expect(sendgridEventToStatus('processed')).toBe('sent');
    expect(sendgridEventToStatus('delivered')).toBe('delivered');
    expect(sendgridEventToStatus('bounce')).toBe('bounced');
    expect(sendgridEventToStatus('dropped')).toBe('dropped');
    expect(sendgridEventToStatus('open')).toBe('opened');
    expect(sendgridEventToStatus('click')).toBe('clicked');
    expect(sendgridEventToStatus('spamreport')).toBe('spam');
    expect(sendgridEventToStatus('unsubscribe')).toBe('unsubscribed');
  });

  it('devuelve null para eventos no mapeados o vacíos', () => {
    expect(sendgridEventToStatus('group_resubscribe')).toBeNull();
    expect(sendgridEventToStatus(undefined)).toBeNull();
  });
});

describe('providerMessageIdFromEvent', () => {
  it('extrae el prefijo de sg_message_id', () => {
    expect(
      providerMessageIdFromEvent({ sg_message_id: 'abc123.recvV3.xyz' }),
    ).toBe('abc123');
  });

  it('devuelve null si falta sg_message_id', () => {
    expect(providerMessageIdFromEvent({})).toBeNull();
  });
});
