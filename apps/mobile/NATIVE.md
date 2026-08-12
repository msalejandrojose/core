# Build nativo iOS / Android (Capacitor)

La app es una PWA (Ionic + React + Vite) que se empaqueta a iOS y Android con
Capacitor. Las carpetas nativas `ios/` y `android/` **no se versionan**
(`.gitignore`): se generan en local y se regeneran cuando cambian los plugins o
la config. Este documento describe el flujo completo.

## Requisitos

- **iOS**: macOS con Xcode + CocoaPods (`sudo gem install cocoapods`).
- **Android**: Android Studio + SDK (variable `ANDROID_HOME`).
- Node/pnpm ya instalados en el monorepo.

## 1. Build de la web

Capacitor copia `dist/` (output de Vite) al contenedor nativo:

```bash
pnpm --filter @core/mobile build
```

## 2. Añadir las plataformas (una vez por máquina)

```bash
cd apps/mobile
pnpm cap:add:ios       # crea ios/     (requiere Xcode)
pnpm cap:add:android   # crea android/ (requiere Android SDK)
```

## 3. Generar iconos y splash

Las fuentes están en `resources/` (`icon.png`, `splash.png`, `splash-dark.png`).
Ver `resources/README.md`. Tras añadir las plataformas:

```bash
pnpm assets:generate
```

Genera los iconos de todas las densidades y las splash screens (claro/oscuro)
dentro de `ios/` y `android/`.

## 4. Sincronizar

Copia la web y la config de `capacitor.config.ts` (plugins: SplashScreen,
StatusBar, PushNotifications) e instala los pods/deps nativos:

```bash
pnpm cap:sync
```

Reejecuta `build` + `cap:sync` cada vez que cambie el código web, y
`assets:generate` cuando cambien los assets.

## 5. Abrir y ejecutar

```bash
pnpm exec cap open ios       # abre Xcode
pnpm exec cap open android   # abre Android Studio
```

Desde el IDE: seleccionar dispositivo/simulador y ejecutar.

## Push notifications (MOB-13)

El código de push vive en `src/features/notifications/` (registro, permisos,
recepción y deep-link) y es **no-op en web/PWA**. Para que funcione en nativo:

- **iOS**: activar la capability *Push Notifications* y *Background Modes →
  Remote notifications* en Xcode; subir la clave APNs a Firebase.
- **Android**: colocar `google-services.json` en `android/app/`. Capacitor ya
  aplica el plugin de Google Services.
- La app sube el token del dispositivo a `POST /me/devices`, endpoint de backend
  **pendiente** (ver tarea «API · Registro de dispositivos para push»).

## Login social (Google / Facebook)

El código web vive en `src/features/auth/use-google-login.ts` y
`use-facebook-login.ts` (llaman a `POST /auth/google` / `POST /auth/facebook`
de la API — ver `apps/api`), sobre el plugin `@capgo/capacitor-social-login`.
Botones en `LoginPage.tsx`. Requiere configurar credenciales en **tres**
sitios: Google/Facebook console, la API (`apps/api/.env`) y la app
(`apps/mobile/.env`).

### 1. Google

1. En [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   crea (o reusa) un proyecto y registra credenciales OAuth 2.0:
   - **Web client ID** (tipo "Web application") — lo usa Android vía
     Credential Manager y también la API para verificar el token.
   - **iOS client ID** (tipo "iOS", con el bundle id `es.aj.core`).
2. Rellena en `apps/mobile/.env`: `VITE_GOOGLE_WEB_CLIENT_ID`,
   `VITE_GOOGLE_IOS_CLIENT_ID`.
3. Rellena en `apps/api/.env`: `GOOGLE_CLIENT_ID` con el/los client ID que
   deban aceptarse (puedes poner varios separados por coma si Android/iOS
   usan IDs distintos — la API valida el `aud` del token contra esta lista).
4. **iOS**: en `ios/App/App/Info.plist` añade un `CFBundleURLTypes` con el
   *reversed client id* del iOS client ID (`com.googleusercontent.apps.XXXX`).
5. **Android**: el plugin usa Credential Manager (login a nivel de SO); no
   necesita `google-services.json` para esto (solo si además usas Firebase
   para push). Asegúrate de que el SHA-1 del keystore de firma está
   registrado como cliente Android en el mismo proyecto de Google Cloud.

### 2. Facebook

1. Crea una app en [developers.facebook.com](https://developers.facebook.com/apps)
   con el producto **Facebook Login**.
2. Copia el **App ID** y el **Client Token** (Configuración → Básica →
   Avanzado).
3. Rellena en `apps/mobile/.env`: `VITE_FACEBOOK_APP_ID`,
   `VITE_FACEBOOK_CLIENT_TOKEN`.
4. Rellena en `apps/api/.env`: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` (la
   API los usa para verificar con `debug_token` que el access token que envía
   el cliente pertenece a esta app, no solo que es válido).
5. **iOS**: en `ios/App/App/Info.plist` añade (sustituyendo `[APP_ID]` /
   `[CLIENT_TOKEN]` / `[APP_NAME]`):
   ```xml
   <key>CFBundleURLTypes</key>
   <array>
     <dict>
       <key>CFBundleURLSchemes</key>
       <array><string>fb[APP_ID]</string></array>
     </dict>
   </array>
   <key>FacebookAppID</key><string>[APP_ID]</string>
   <key>FacebookClientToken</key><string>[CLIENT_TOKEN]</string>
   <key>FacebookDisplayName</key><string>[APP_NAME]</string>
   <key>LSApplicationQueriesSchemes</key>
   <array>
     <string>fbapi</string>
     <string>fbauth</string>
     <string>fb-messenger-share-api</string>
     <string>fbauth2</string>
     <string>fbshareextension</string>
   </array>
   ```
   Y en `ios/App/App/AppDelegate.swift` conecta `FBSDKCoreKit` en
   `didFinishLaunchingWithOptions` y `open url` — ver el README del plugin
   (`node_modules/@capgo/capacitor-social-login/README.md`) para el código
   exacto.
6. **Android**: sigue la [guía oficial de Facebook para Android](https://developers.facebook.com/docs/android/getting-started)
   (declarar `FacebookActivity` y el `ContentProvider` en el manifest —
   `cap sync` ya copia los valores de `appId`/`clientToken` que pases a
   `SocialLogin.initialize()` en tiempo de ejecución, pero el manifest nativo
   hay que tocarlo a mano una vez).

### Backend

Los endpoints `POST /auth/google` y `POST /auth/facebook` viven en
`apps/api/src/modules/iam/`. Verifican el token contra el proveedor
(`GoogleTokenVerifier` / `FacebookTokenVerifier`, ambos con `fetch` nativo,
sin SDKs) y crean o vinculan el usuario (`ResolveSocialUserUseCase`). Las
columnas nuevas en `user` (`google_id`, `facebook_id`, `avatar_url`) están en
la migración `add_social_login_to_user`.

## Notas

- `appId`: `es.aj.core` · `appName`: `Core` (en `capacitor.config.ts`).
- El estilo de la status bar (claro/oscuro) se ajusta en caliente desde
  `ThemeProvider` según el tema del usuario.
- La splash se auto-oculta al cargar la web (sin spinner), con fondo greige
  claro y su variante oscura.
