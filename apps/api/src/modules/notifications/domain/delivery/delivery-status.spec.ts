import { mergeStatus, statusRank } from './delivery-status';

describe('mergeStatus', () => {
  it('progresa con el engagement', () => {
    expect(mergeStatus('sent', 'delivered')).toBe('delivered');
    expect(mergeStatus('delivered', 'opened')).toBe('opened');
    expect(mergeStatus('opened', 'clicked')).toBe('clicked');
  });

  it('no rebaja un estado más avanzado (webhooks desordenados)', () => {
    expect(mergeStatus('delivered', 'sent')).toBe('delivered');
    expect(mergeStatus('clicked', 'delivered')).toBe('clicked');
  });

  it('los estados negativos son terminales y ganan', () => {
    expect(mergeStatus('delivered', 'bounced')).toBe('bounced');
    expect(mergeStatus('opened', 'spam')).toBe('spam');
    expect(statusRank('bounced')).toBeGreaterThan(statusRank('clicked'));
  });
});
