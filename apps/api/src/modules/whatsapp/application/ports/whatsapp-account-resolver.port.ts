export const WHATSAPP_ACCOUNT_RESOLVER = Symbol('WHATSAPP_ACCOUNT_RESOLVER');

/** Cuenta WHATSAPP resuelta con la config ya DESCIFRADA, lista para despachar. */
export interface ResolvedWhatsappAccount {
  id: string;
  name: string;
  config: Record<string, unknown>;
}

/** Resumen no sensible de una cuenta, para poblar el selector del backoffice. */
export interface WhatsappAccountSummary {
  id: string;
  name: string;
  phoneNumberId: string | null;
}

/**
 * Puente hacia el módulo `notifications`: resuelve las `SendingAccount` de canal
 * WHATSAPP. Aísla a este módulo de cómo se persisten y cifran las cuentas.
 */
export interface WhatsappAccountResolverPort {
  /** Mapea el phone_number_id del webhook a su cuenta (config descifrada). */
  resolveByPhoneNumberId(
    phoneNumberId: string,
  ): Promise<ResolvedWhatsappAccount | null>;
  getById(accountId: string): Promise<ResolvedWhatsappAccount | null>;
  listAccounts(): Promise<WhatsappAccountSummary[]>;
}
