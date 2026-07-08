import { useEffect } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { findSection } from '@core/sections';
import { useSectionsStore } from './sections.store';
import SectionMenu from './SectionMenu';

/**
 * Pantalla de una sección, resuelta por `code` desde el árbol en el store. Si
 * la sección tiene hijos, muestra su submenú; si es una hoja, un placeholder
 * (el listado/detalle reales llegan en MOB-09 / MOB-10). Carga el árbol al
 * montar para soportar deep-links directos.
 */
export default function SectionScreen() {
  const { code } = useParams<{ code: string }>();
  const tree = useSectionsStore((s) => s.tree);
  const load = useSectionsStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  const node = findSection(tree, code);
  const children = node?.children ?? [];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/home" text="" />
          </IonButtons>
          <IonTitle>{node?.name ?? 'Sección'}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {children.length > 0 ? (
          <SectionMenu nodes={children} />
        ) : (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <p className="core-subtitle">
              Esta sección estará disponible pronto.
            </p>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
