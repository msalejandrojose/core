/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_WEB_CLIENT_ID?: string;
  readonly VITE_GOOGLE_IOS_CLIENT_ID?: string;
  /** 'true' enseña «Continuar con Apple» en iOS (requiere la capacidad Sign in with Apple). */
  readonly VITE_APPLE_SIGN_IN?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
  readonly VITE_FACEBOOK_CLIENT_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
