// Selección del proveedor de email por cuenta. Puro y sin SDKs (testeable sin
// tocar red). El dispatcher enruta según lo que devuelva:
//   - 'fallback': la cuenta no trae apiKey propia ⇒ mailer global (env).
//   - 'sendgrid': provider explícito SendGrid.
//   - 'resend':   por defecto (retrocompatible con las cuentas existentes).
export type EmailProvider = 'resend' | 'sendgrid' | 'fallback';

export interface EmailProviderConfig {
  provider?: string;
  apiKey?: string;
}

export function resolveEmailProvider(
  config: EmailProviderConfig,
): EmailProvider {
  if (!config.apiKey) return 'fallback';
  return config.provider === 'sendgrid' ? 'sendgrid' : 'resend';
}
