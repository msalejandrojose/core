import { useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useLiveStore } from '../live/live.store';
import { useRegisterStore } from '../register.store';
import { parseDeepLink } from './deep-links';

/** Abre la app donde pide el widget (ver `deep-links.ts`). */
export function useWidgetDeepLinks(): void {
  const history = useHistory();
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = App.addListener('appUrlOpen', ({ url }) => {
      const link = parseDeepLink(url);
      if (!link) return;
      if (link.kind === 'route') {
        history.push(link.path);
        return;
      }
      // Con un entreno a medias, se vuelve a él; si no, se empieza el de hoy.
      if (useLiveStore.getState().workout) {
        history.push('/tabs/today/entreno');
        return;
      }
      history.push('/tabs/today');
      useRegisterStore.getState().open('activity', undefined, { routineId: link.routineId });
    });
    return () => {
      void handle.then((h) => h.remove());
    };
  }, [history]);
}
