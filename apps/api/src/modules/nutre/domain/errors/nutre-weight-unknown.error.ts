import { DomainError } from '../../../../shared/errors/domain-error';

// Estimar el gasto de una sesión necesita el peso del usuario (kcal ≈ MET ×
// kg × horas). Sin ninguna pesada registrada no se inventa un peso por
// defecto: se pide el dato.
export class NutreWeightUnknownError extends DomainError {
  constructor(userId: string) {
    super(
      'NUTRE_WEIGHT_UNKNOWN',
      'Necesitamos tu peso para estimar las calorías. Registra una pesada primero.',
      { userId },
    );
  }
}
