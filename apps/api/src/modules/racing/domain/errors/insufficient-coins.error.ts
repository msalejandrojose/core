import { DomainError } from '../../../../shared/errors/domain-error';

// El jugador no tiene suficiente saldo para la compra — no es un fallo del
// sistema, así que no es 500: 402 Payment Required es el código que existe
// justo para esto.
export class InsufficientCoinsError extends DomainError {
  constructor(priceCoins: number) {
    super(
      'RACING_INSUFFICIENT_COINS',
      `No tienes suficientes monedas — esto cuesta ${priceCoins}.`,
      { priceCoins },
    );
  }
}
