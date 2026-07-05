/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_API_URL: string;
  readonly PUBLIC_SITE_URL: string;
  /** Hash de la FormInstance pública de captación de leads (seed:leads). */
  readonly PUBLIC_LEADS_FORM_HASH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
