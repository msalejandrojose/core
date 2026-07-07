import { Inject, Injectable, Optional } from '@nestjs/common';
import { AsyncValidatorNotFoundError } from '../../domain/errors/async-validator-not-found.error';
import {
  ASYNC_VALIDATORS,
  type AsyncValidator,
} from '../ports/async-validator.port';

/**
 * Índice `ref → AsyncValidator`. Recoge todos los validadores async registrados
 * y los expone por su `ref`.
 */
@Injectable()
export class AsyncValidatorRegistry {
  private readonly byRef = new Map<string, AsyncValidator>();

  constructor(
    @Optional()
    @Inject(ASYNC_VALIDATORS)
    validators: AsyncValidator[] = [],
  ) {
    for (const v of validators) this.byRef.set(v.ref, v);
  }

  /** Refs disponibles, ordenadas. */
  refs(): string[] {
    return [...this.byRef.keys()].sort();
  }

  /** Validador de un `ref`, o lanza si no está registrado. */
  get(ref: string): AsyncValidator {
    const validator = this.byRef.get(ref);
    if (!validator) throw new AsyncValidatorNotFoundError(ref);
    return validator;
  }
}
