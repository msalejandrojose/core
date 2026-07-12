// Puerto que Andanzas usa para empujar una notificación in-app. Andanzas no
// posee el inbox de notificaciones (vive en `user-notifications`) — este
// puerto es la única frontera por la que el módulo depende de él, en vez de
// importar su use-case concreto directamente en application/.
export const NOTIFIER = Symbol('NOTIFIER');

export interface NotifyInput {
  userId: string;
  kind: string;
  title: string;
  body?: string;
  data?: unknown;
}

export interface NotifierPort {
  notify(input: NotifyInput): Promise<void>;
}
