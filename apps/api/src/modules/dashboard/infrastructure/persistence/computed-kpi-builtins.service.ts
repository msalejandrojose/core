import { Injectable, OnModuleInit } from '@nestjs/common';
import { KpiRegistry } from '../../application/kpi-registry.service';

@Injectable()
export class ComputedKpiBuiltinsService implements OnModuleInit {
  constructor(private readonly registry: KpiRegistry) {}

  onModuleInit() {
    this.registry.registerComputed({
      slug: 'users.activation_rate',
      label: 'Tasa de activación',
      description: 'Usuarios activos / usuarios totales',
      category: 'users',
      unit: 'percent',
      format: 'decimal',
      computed: {
        kind: 'op',
        op: 'div',
        left: { kind: 'kpi', slug: 'users.active' },
        right: { kind: 'kpi', slug: 'users.total' },
      },
    });

    this.registry.registerComputed({
      slug: 'blog.publish_rate',
      label: 'Ratio de publicación',
      description: 'Posts publicados sobre el total de posts',
      category: 'blog',
      unit: 'percent',
      format: 'decimal',
      computed: {
        kind: 'op',
        op: 'div',
        left: { kind: 'kpi', slug: 'blog.posts.published' },
        right: {
          kind: 'op',
          op: 'add',
          left: { kind: 'kpi', slug: 'blog.posts.published' },
          right: { kind: 'kpi', slug: 'blog.posts.draft' },
        },
      },
    });

    this.registry.registerComputed({
      slug: 'storage.bytes_per_user',
      label: 'Almacenamiento por usuario',
      description: 'Bytes totales almacenados dividido entre usuarios totales',
      category: 'storage',
      unit: 'bytes',
      format: 'compact',
      computed: {
        kind: 'op',
        op: 'div',
        left: { kind: 'kpi', slug: 'files.bytes_total' },
        right: { kind: 'kpi', slug: 'users.total' },
      },
    });
  }
}
