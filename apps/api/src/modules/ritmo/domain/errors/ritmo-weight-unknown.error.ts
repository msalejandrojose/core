import { DomainError } from '../../../../shared/errors/domain-error';

// Estimar el gasto de una sesión necesita el peso del usuario (kcal ≈ MET ×
// kg × horas). Sin ninguna pesada registrada no se inventa un peso por
// defecto: se pide el dato.
export class RitmoWeightUnknownError extends DomainError {
  constructor(userId: string) {
    super(
      'RITMO_WEIGHT_UNKNOWN',
      'Necesitamos tu peso para estimar las calorías. Registra una pesada primero.',
      { userId },
    );
  }
}
