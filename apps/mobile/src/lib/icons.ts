import {
  appsOutline,
  clipboardOutline,
  documentsOutline,
  folderOutline,
  gridOutline,
  globeOutline,
  listOutline,
  locationOutline,
  mapOutline,
  newspaperOutline,
  peopleOutline,
  layersOutline,
  shieldOutline,
} from 'ionicons/icons';

/**
 * Las secciones guardan su icono como nombre estilo lucide (PascalCase), igual
 * que el backoffice. En mobile usamos ionicons, así que mapeamos los nombres
 * conocidos a su equivalente de línea. Los no mapeados caen a un icono neutro.
 */
const ICONS: Record<string, string> = {
  LayoutDashboard: gridOutline,
  Shield: shieldOutline,
  Users: peopleOutline,
  SquareStack: layersOutline,
  Newspaper: newspaperOutline,
  LayoutList: listOutline,
  Files: documentsOutline,
  ClipboardList: clipboardOutline,
  MapPin: locationOutline,
  Globe: globeOutline,
  Map: mapOutline,
  Folder: folderOutline,
};

/** Resuelve el nombre de icono de una sección a un icono de ionicons. */
export function resolveSectionIcon(name?: string | null): string {
  if (name && ICONS[name]) return ICONS[name];
  return appsOutline;
}
