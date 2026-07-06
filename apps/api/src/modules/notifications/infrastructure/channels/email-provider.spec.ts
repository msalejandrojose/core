import { resolveEmailProvider } from './email-provider';

describe('resolveEmailProvider', () => {
  it('sin apiKey → fallback (mailer global)', () => {
    expect(resolveEmailProvider({})).toBe('fallback');
    expect(resolveEmailProvider({ provider: 'sendgrid' })).toBe('fallback');
  });

  it('apiKey + provider sendgrid → sendgrid', () => {
    expect(resolveEmailProvider({ provider: 'sendgrid', apiKey: 'k' })).toBe(
      'sendgrid',
    );
  });

  it('apiKey sin provider → resend (retrocompatible)', () => {
    expect(resolveEmailProvider({ apiKey: 'k' })).toBe('resend');
  });

  it('apiKey + provider resend → resend', () => {
    expect(resolveEmailProvider({ provider: 'resend', apiKey: 'k' })).toBe(
      'resend',
    );
  });
});
