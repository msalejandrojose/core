/**
 * Traducciones en español (idioma por defecto de la app mobile). Espejo de la
 * infraestructura del backoffice (BO-28): fase 1 solo español, la
 * infraestructura permite añadir idiomas creando nuevos recursos.
 *
 * Las claves `sections.<code>` resuelven los labels del árbol de navegación por
 * `code`; si falta una clave se usa el `name` literal del árbol como fallback.
 */
export const es = {
  translation: {
    tabs: {
      home: 'Inicio',
      notifications: 'Notificaciones',
      settings: 'Ajustes',
    },
    settings: {
      account: 'Cuenta',
      profile: 'Perfil',
      appearance: 'Apariencia',
      logout: 'Cerrar sesión',
    },
    appearance: {
      title: 'Apariencia',
      theme: 'Tema',
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema',
      hint: 'El tema «Sistema» sigue la apariencia de tu dispositivo.',
    },
    sections: {
      dashboard: 'Panel',
    },
  },
} as const;
