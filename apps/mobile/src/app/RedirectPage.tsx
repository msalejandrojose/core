import { useEffect } from 'react';
import { matchPath, useHistory, useRouteMatch } from 'react-router-dom';
import { IonContent, IonPage } from '@ionic/react';

/**
 * Redirección apta para `IonRouterOutlet`. Ionic deja montadas las páginas de
 * la pila y necesita que cada ruta pinte un `<IonPage>`: un `<Redirect>` de
 * react-router no lo hace, así que el outlet se queda sin elemento de página
 * (falla `isViewVisible` con `classList` de undefined) y, como la vista sigue
 * viva, vuelve a redirigir en cada transición. Pasaba al entrar: `/correo`
 * mandaba a Hoy, Hoy al alta y la vista de `/correo` devolvía a Hoy.
 *
 * Esto pinta una página vacía y navega al montarse, pero solo si la URL actual
 * es la de la ruta que la pinta: Ionic vuelve a montar vistas de la pila en
 * cada transición, y una vista vieja no debe secuestrar la navegación.
 */
export function RedirectPage({ to }: { to: string }) {
  const history = useHistory();
  const route = useRouteMatch();
  useEffect(() => {
    const here = history.location.pathname;
    const mine = matchPath(here, { path: route.path, exact: route.isExact });
    if (mine && here !== to) history.replace(to);
    // Solo al montarse: la vista puede quedarse en la pila y re-renderizarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <IonPage>
      <IonContent />
    </IonPage>
  );
}
