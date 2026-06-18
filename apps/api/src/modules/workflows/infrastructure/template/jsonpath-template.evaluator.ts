import { Injectable } from '@nestjs/common';
import {
  TemplateEvaluatorPort,
  TemplateScope,
} from '../../application/ports/template-evaluator.port';

// Mini-evaluador JSONPath (spec §6.2). Sustituye `{{ ruta }}` por lookup de
// ruta sobre los scopes. Sin code-eval, sin librerías.
const FULL_PLACEHOLDER = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
const EMBEDDED_PLACEHOLDER = /\{\{\s*([^}]+?)\s*\}\}/g;

@Injectable()
export class JsonPathTemplateEvaluator implements TemplateEvaluatorPort {
  render<T>(value: T, scope: TemplateScope): T {
    return this.renderValue(value, scope) as T;
  }

  private renderValue(value: unknown, scope: TemplateScope): unknown {
    if (typeof value === 'string') return this.renderString(value, scope);
    if (Array.isArray(value)) {
      return value.map((v) => this.renderValue(v, scope));
    }
    if (value !== null && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = this.renderValue(v, scope);
      }
      return out;
    }
    return value;
  }

  private renderString(str: string, scope: TemplateScope): unknown {
    const full = FULL_PLACEHOLDER.exec(str);
    if (full) {
      // Placeholder solo → preserva el tipo del valor resuelto.
      return this.lookup(full[1].trim(), scope);
    }
    // Placeholders embebidos → interpola como string.
    return str.replace(EMBEDDED_PLACEHOLDER, (_match, path: string) => {
      const v = this.lookup(path.trim(), scope);
      if (v == null) return '';
      switch (typeof v) {
        case 'string':
          return v;
        case 'number':
        case 'boolean':
        case 'bigint':
          return String(v);
        default:
          return JSON.stringify(v) ?? '';
      }
    });
  }

  private lookup(path: string, scope: TemplateScope): unknown {
    const root = scope as unknown as Record<string, unknown>;
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc == null || typeof acc !== 'object') return undefined;
      return (acc as Record<string, unknown>)[key];
    }, root);
  }
}
