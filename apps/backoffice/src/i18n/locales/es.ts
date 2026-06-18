/**
 * Traducciones en español (idioma por defecto). Las claves `sections.<code>`
 * resuelven los labels del árbol de navegación a partir del `code` de cada
 * sección; si falta una clave se usa el `name` literal del árbol como fallback.
 */
export const es = {
  translation: {
    sections: {
      dashboard: 'Dashboard',
      iam: 'IAM',
      users: 'Usuarios',
      roles: 'Roles',
      sections: 'Secciones',
      files: 'Archivos',
    },
    userMenu: {
      profile: 'Perfil',
      logout: 'Cerrar sesión',
    },
  },
} as const;
