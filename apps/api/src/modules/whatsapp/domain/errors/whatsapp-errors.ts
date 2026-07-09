import { DomainError } from '../../../../shared/errors/domain-error';

export class WhatsappConversationNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'WHATSAPP_CONVERSATION_NOT_FOUND',
      `Conversación de WhatsApp ${id} no encontrada.`,
      { id },
    );
  }
}

export class WhatsappAccountNotFoundError extends DomainError {
  constructor(ref: string) {
    super(
      'WHATSAPP_ACCOUNT_NOT_FOUND',
      `Cuenta de WhatsApp ${ref} no encontrada o sin configurar.`,
      { ref },
    );
  }
}

export class WhatsappSendFailedError extends DomainError {
  constructor(cause: unknown) {
    super(
      'WHATSAPP_SEND_FAILED',
      cause instanceof Error ? cause.message : 'Fallo al enviar por WhatsApp.',
    );
  }
}
