/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /**
   * Base pública donde la web renderizará los formularios (tarea #94). Se usa
   * para construir el enlace copiable de cada instancia: `${base}/forms?f=:hash`.
   * Si no se define, se usa el origin actual como fallback.
   */
  readonly VITE_PUBLIC_FORMS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
