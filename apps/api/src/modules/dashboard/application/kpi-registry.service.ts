import { Injectable } from '@nestjs/common';
import type { KpiDefinition } from './kpi-definition';

@Injectable()
export class KpiRegistry {
  private readonly defs = new Map<string, KpiDefinition>();

  register(def: KpiDefinition): void {
    this.defs.set(def.slug, def);
  }

  get(slug: string): KpiDefinition | undefined {
    return this.defs.get(slug);
  }

  getAll(): KpiDefinition[] {
    return [...this.defs.values()];
  }
}
