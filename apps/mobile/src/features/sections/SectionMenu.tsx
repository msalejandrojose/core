import { IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { chevronForward } from 'ionicons/icons';
import type { SectionTreeNode } from '@core/sections';
import { resolveSectionIcon } from '@/lib/icons';

/** Ordena por el campo `order` del DS de secciones. */
function byOrder(nodes: SectionTreeNode[]): SectionTreeNode[] {
  return [...nodes].sort((a, b) => a.order - b.order);
}

/**
 * Lista navegable de secciones (filas tipo Ajustes iOS). Cada fila navega a
 * `/tabs/home/s/:code`, que resuelve si la sección tiene hijos (submenú) o es
 * una hoja (pantalla de sección). Reutilizable en la home y en submenús.
 */
export default function SectionMenu({ nodes }: { nodes: SectionTreeNode[] }) {
  const ordered = byOrder(nodes);
  return (
    <IonList inset className="core-group">
      {ordered.map((node, i) => (
        <IonItem
          key={node.id}
          button
          detail={false}
          lines={i === ordered.length - 1 ? 'none' : 'inset'}
          routerLink={`/tabs/home/s/${node.code}`}
          routerDirection="forward"
        >
          <span slot="start" className="core-tint-icon" aria-hidden="true">
            <IonIcon icon={resolveSectionIcon(node.icon)} />
          </span>
          <IonLabel>{node.name}</IonLabel>
          <IonIcon
            slot="end"
            icon={chevronForward}
            aria-hidden="true"
            style={{ color: 'var(--core-muted)', fontSize: 16 }}
          />
        </IonItem>
      ))}
    </IonList>
  );
}
