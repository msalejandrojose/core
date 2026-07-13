export interface CommissionSplit {
  platformFeeAmount: number;
  hostPayoutAmount: number;
}

/**
 * Reparte el importe cobrado al huésped entre la comisión de la plataforma y
 * lo que le corresponde al host. `feePercent` es 0-100 (p.ej. 10 = 10%).
 *
 * La liquidación al host (`Payment.hostPayoutStatus`) es un registro manual
 * — no hay integración real de transferencias a terceros (eso requeriría
 * Stripe Connect y el onboarding bancario del host, fuera de alcance de
 * TASK-153). Un admin la marca `RELEASED` cuando la transferencia se hace
 * por fuera del sistema (ver `ReleaseHostPayoutUseCase`).
 */
export function calculateCommissionSplit(
  amount: number,
  feePercent: number,
): CommissionSplit {
  const platformFeeAmount = Math.round(amount * (feePercent / 100) * 100) / 100;
  const hostPayoutAmount = Math.round((amount - platformFeeAmount) * 100) / 100;
  return { platformFeeAmount, hostPayoutAmount };
}
