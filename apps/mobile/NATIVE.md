# Build nativo iOS / Android (Capacitor)

La app es una PWA (Ionic + React + Vite) que se empaqueta a iOS y Android con
Capacitor. Las carpetas nativas `ios/` y `android/` **no se versionan**
(`.gitignore`): se generan en local y se regeneran cuando cambian los plugins o
la config. Este documento describe el flujo completo.

## `native.config.yml` + `native:prepare`: generar `ios/` y `android/`

Todo lo nativo que este documento cuenta que hay que hacer a mano tras `cap add`
(Info.plist, entitlements, iOS 15, widgets, permisos de Android…) está en
`native.config.yml`, con perfiles para cada destino: `device` (instalar en un
móvil), `mac` (app conectada al Mac por ZeroTier), `testflight` y `production`.
`native:prepare` borra la plataforma y la vuelve a generar desde cero con todo
aplicado: compila la web con las variables del perfil, `cap add`, Info.plist,
entitlements, Podfile, proyecto de Xcode (código de `native/ios`, extensión
`BrioWidgets`, controlador propio), manifest, strings y Gradle, iconos y splash,
y `cap sync`.

```bash
# ver lo que sale para un perfil y qué variables faltan (p. ej. APPLE_TEAM_ID,
# que va en .env.production.local)
pnpm --filter @core/mobile native:config --profile device --platform ios
# generar
pnpm --filter @core/mobile native:prepare --profile device --platform ios
```

Opciones de `native:prepare`: `--platform ios|android` (por defecto las dos),
`--build-number N` (por defecto, minutos desde el 1-1-2026, que siempre crece) y
`--skip-web` (usa el `dist/` que haya). **No tocar `ios/` ni `android/` a mano**:
lo que no esté en el YAML se pierde al regenerar.

### Validado en el Mac (28 nov 2026)

El `ios/` generado se comparó con el que se montaba a mano (mismos
entitlements, team, bundle ids y versiones mínimas) y `fastlane ios build
profile:device` lo instaló por Wi-Fi encima del anterior sin perder datos:
widgets, Live Activity, Salud y login con Google funcionan. Si
`capacitor-assets` falla con «Something went wrong installing the sharp
module», recompilar el `sharp` que usa (0.32.6):
`cd node_modules/.pnpm/sharp@0.32.6/node_modules/sharp && npm run install`.

## Builds con fastlane (instalar en el móvil, TestFlight, tiendas)

`fastlane/Fastfile` compila con un perfil de `native.config.yml`: regenera la
plataforma (`native:prepare`), compila y, según el perfil, instala o sube.

| Comando (desde `apps/mobile`) | Qué hace |
|---|---|
| `bundle exec fastlane ios devices` | Lista los iPhones emparejados (cable o Wi-Fi) |
| `bundle exec fastlane ios build profile:device [device:"iPhone de …"]` | Compila e instala en el iPhone y abre la app |
| `bundle exec fastlane ios build profile:testflight` | Sube a TestFlight (cuenta de pago) |
| `bundle exec fastlane ios build profile:production` | Sube a la App Store y la envía a revisión |
| `bundle exec fastlane android build profile:device [device:<serial>]` | APK de debug (y lo instala por adb si se le pasa `device:`) |
| `bundle exec fastlane android build profile:testflight` / `production` | AAB firmado a la pista interna / producción de Google Play |

Todos aceptan `build_number:N` (si no, `BUILD_NUMBER` o minutos desde 2026). El
resultado (.app, .ipa, .apk o .aab) y `last-build.json` quedan en `native-build/`.

### Preparar el Mac (una vez)

1. **Ruby ≥ 3.2** (el de macOS es 2.6): rbenv o `brew install ruby` con su
   `bin` delante en el `PATH` (lo dice `brew info ruby`). Después, en
   `apps/mobile`: `bundle install`. Instala fastlane y CocoaPods (van en el
   `Gemfile`: dentro de `bundle exec` no se ve el `pod` del sistema). CocoaPods
   pide `export LANG=en_US.UTF-8`.
2. **iOS en el móvil**: Xcode con la cuenta de Apple iniciada (Settings ›
   Accounts) y el iPhone con el Modo desarrollador. Para instalar por **Wi-Fi**:
   conectarlo una vez por cable, y en Xcode › Window › Devices and Simulators
   marcar «Connect via network». Desde entonces basta con que esté en la misma
   red que el Mac (`fastlane ios devices` lo enseña como `localNetwork`).
3. **TestFlight / App Store** (cuenta de pago): `APPLE_ACCOUNT=paid` y una clave
   de la API de App Store Connect (Users and Access › Integrations › App Store
   Connect API, rol App Manager): `ASC_KEY_ID`, `ASC_ISSUER_ID` y `ASC_KEY_PATH`
   (ruta del `.p8`, fuera del repo). La app tiene que existir antes en App Store
   Connect con el bundle id `es.aj.brio`.
4. **Android**: Android Studio (el Fastfile usa su JDK y `~/Library/Android/sdk`
   si `JAVA_HOME` / `ANDROID_HOME` no están). Para instalar por Wi-Fi: depuración
   inalámbrica en el móvil, `adb pair` y `adb connect`, y `device:<ip:puerto>`.
5. **Google Play**: keystore de subida (`ANDROID_KEYSTORE_PATH`,
   `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`) y la
   cuenta de servicio de Play (`PLAY_SERVICE_ACCOUNT_JSON`). Google exige que el
   **primer** AAB se suba a mano desde Play Console; los siguientes ya los sube
   fastlane. Si la cuenta de Play es personal y nueva, pide una prueba cerrada
   (12 testers, 14 días) antes de dar acceso a producción.

Las variables van en `apps/mobile/.env.production.local` (no se commitea) o en
el entorno del runner; las rutas a `.p8`, keystore y JSON, siempre fuera del repo.

## A mano, sin `native:prepare`

Lo normal es `native:prepare` o fastlane. Los pasos sueltos siguen sirviendo
para entender qué hacen o para tocar una sola cosa.

### Requisitos

- **iOS**: macOS con Xcode; CocoaPods sale del `Gemfile` (`bundle install`).
- **Android**: Android Studio + SDK (variable `ANDROID_HOME`).
- Node/pnpm ya instalados en el monorepo.

### 1. Build de la web

Capacitor copia `dist/` (output de Vite) al contenedor nativo:

```bash
pnpm --filter @core/mobile build
```

### 2. Añadir las plataformas (una vez por máquina)

```bash
cd apps/mobile
pnpm cap:add:ios       # crea ios/     (requiere Xcode)
pnpm cap:add:android   # crea android/ (requiere Android SDK)
```

### 3. Generar iconos y splash

Las fuentes están en `resources/` (`icon.png`, `splash.png`, `splash-dark.png`).
Ver `resources/README.md`. Tras añadir las plataformas:

```bash
pnpm assets:generate
```

Genera los iconos de todas las densidades y las splash screens (claro/oscuro)
dentro de `ios/` y `android/`.

### 4. Sincronizar

Copia la web y la config de `capacitor.config.ts` (plugins: SplashScreen,
StatusBar, PushNotifications) e instala los pods/deps nativos:

```bash
pnpm cap:sync
```

Reejecuta `build` + `cap:sync` cada vez que cambie el código web, y
`assets:generate` cuando cambien los assets.

### 5. Abrir y ejecutar

```bash
pnpm exec cap open ios       # abre Xcode
pnpm exec cap open android   # abre Android Studio
```

Desde el IDE: seleccionar dispositivo/simulador y ejecutar.

## iOS: lo que pone `native:prepare`

Todo sale de la sección `ios` de `native.config.yml`; si hace falta otro ajuste
nativo, va ahí (o en `native/ios/` si es Swift), nunca en `ios/` a mano:

- **iOS 15 mínimo** en el proyecto y en todos los pods (Podfile). La extensión
  `BrioWidgets` pide 17.
- **Info.plist**: `CFBundleName` = Brío (si no, los avisos dicen «App»), textos
  de Salud, cámara (códigos de barras), micrófono y dictado (hablar al coach;
  sin ellos iOS cierra la app), `LSApplicationQueriesSchemes` con `hevy`,
  `NSSupportsLiveActivities` y los esquemas `brio://` y el de Google.
- **Entitlements**: HealthKit y el App Group `group.es.aj.brio`.
- **`NSAppTransportSecurity`** (http) solo en el perfil `mac` (ZeroTier). Los
  demás van por https.
- **Controlador propio** `BrioBridgeViewController` en Main.storyboard y en
  `SceneDelegate.swift`: registra los plugins de widgets y Live Activity.
- **Sign in with Apple** está en `ios.paidAccountOnly`: solo se añade con
  `APPLE_ACCOUNT=paid` (con la cuenta gratuita la app no firma si lo lleva).
  Además hay que activarlo en el App ID (developer.apple.com) y poner
  `VITE_APPLE_SIGN_IN=true`. La API acepta tokens con `aud` = `APPLE_CLIENT_ID`
  (por defecto `es.aj.brio`).

Usar el pnpm del repo (`packageManager`, 10.x): con otra versión mayor, `pnpm
add` falla por la ubicación del store. `npx pnpm@10.11.0 …` sirve.

## iOS: Live Activity del entreno en vivo

La pantalla bloqueada y la Dynamic Island enseñan el entreno de gimnasio en
curso (ejercicio, serie, peso, repes y descanso) con botones que funcionan sin
desbloquear: ✓ serie hecha, ±2,5 kg, ±1 repe, ejercicio anterior/siguiente y
saltar descanso. Requiere iOS 17 (la app sigue funcionando en 15; solo no sale).

Como `ios/` no se commitea, el código nativo vive en `native/ios/` y
`native:prepare` lo engancha al proyecto de Xcode (`scripts/ios-project.rb`):
el target `BrioWidgets` (extensión WidgetKit, bundle `es.aj.brio.widgets`),
`native/ios/Shared` (modelo e intents) en la app y en la extensión, y
`native/ios/App` (plugins y controlador) en la app.

Cómo funciona: la web manda el estado completo al plugin (`useLiveActivitySync`,
montado en `TabsShell`); los botones son `LiveActivityIntent`, que iOS ejecuta
en el proceso de la app aunque esté bloqueada: actualizan la actividad y dejan
el estado pendiente, que la web recoge (`takeChanges`) al instante si está viva
o al volver a la app. Con la cuenta gratuita de Apple funciona igual (no usa
App Groups ni push).

## iOS: widgets de la pantalla de inicio

Cuatro widgets en la misma extensión `BrioWidgets` (iOS 17):

- **Hoy** (pequeño y mediano): anillos de comida, entreno y pasos, y macros.
- **Entreno de hoy** (pequeño y mediano): lo que toca según el plan con
  «Empezar», o lo ya hecho. Al tocarlo abre la app y empieza la rutina del día
  (o vuelve al entreno en curso).
- **Mi semana** (mediano): la tira de la semana con el deporte de cada día.
- **Hoy y semana** (mediano): el reloj de la comida (anillos con las kcal que
  quedan) y la tira de la semana. El reloj abre Hoy y la semana, el plan.

Cómo funciona: la pantalla Hoy calcula una instantánea
(`src/features/brio/widgets/widget-snapshot.ts`) y la manda al plugin
`BrioWidgets` (`native/ios/App/BrioWidgetsPlugin.swift`), que la guarda en el
**App Group `group.es.aj.brio`** y recarga los widgets. Los widgets
(`native/ios/Widget/BrioHomeWidgets.swift`) solo la leen; a medianoche pasan
solos a «Abre Brío» hasta que la app vuelve a abrirse. Al tocar un widget, la
app se abre con `brio://hoy`, `brio://entreno?routine=…` o `brio://plan`
(`useWidgetDeepLinks`, en `TabsShell`). Al cerrar sesión se borran los datos.

`native:prepare` también pone el App Group en los entitlements de la app y de
la extensión (`native/ios/Widget/BrioWidgets.entitlements`) y registra el
esquema `brio://`. Con la cuenta gratuita firma igual (probado el 28 nov
2026). Si alguna vez Xcode se niega a firmar el App Group, los widgets se
quedan sin datos y la Live Activity sigue funcionando.

Para añadirlos al iPhone: mantener pulsada la pantalla de inicio › «+» › Brío.

## Instalar la app normal (contra la API de Cloud Run)

```bash
pnpm --filter @core/mobile ios:prod
```

Compila la web contra la API de producción
(`https://brio-api.ajly.online`) y hace `cap sync ios`
sin el modo «conectada al Mac», aunque `.env.production.local` tenga
`CAP_SERVER_URL` o una `VITE_API_URL` de pruebas (el resto de ese archivo, como
los client IDs de Google, se sigue usando). Después compila e instala con Forja
o Xcode. La app así instalada funciona sin el Mac.

`pnpm build:mobile` (lo que lanza Forja) e `ios:prod` regeneran antes el cliente
tipado (`packages/api-client/src/generated/schema.d.ts`, que no está en git) a partir
de la API del repo, sin base de datos: así un cliente viejo en el Mac no rompe `tsc`.

`.env.production` (en git) ya lleva esa `VITE_API_URL`, así que un `vite build`
sin `.env.production.local` también apunta a producción.

## App conectada al Mac por ZeroTier (probar sin reinstalar)

Con la cuenta gratuita, Xcode solo instala por cable o en la misma Wi-Fi. Para
probar cambios de web desde cualquier sitio, la app puede cargar la web del Mac:

1. En `apps/mobile/.env.production.local` (no se commitea):
   `CAP_SERVER_URL=http://<IP-ZeroTier-del-Mac>:4410`
2. En el Mac, deja corriendo el servidor de la app en esa IP, apuntando a la API
   por ZeroTier:
   ```bash
   cd apps/mobile && npx vite --mode production --host <IP-ZeroTier> --port 4410
   ```
   `--mode production` hace que lea `.env.production.local` (la API por ZeroTier
   y los client IDs de Google): en modo desarrollo no los tiene y el login con
   Google no arranca.
   y añade `http://<IP-ZeroTier>:4410` a `CORS_ORIGINS` de la API.
3. Instala la app una vez en casa (Forja o Xcode). A partir de ahí, con ZeroTier
   activo en el iPhone y el Mac encendido, cada cambio de web se ve al volver a
   abrir la app. Los cambios nativos (plugins, permisos) y la firma de 7 días
   siguen pidiendo reinstalar en casa.

Para volver al build normal: `pnpm --filter @core/mobile ios:prod` y reinstala (o quita `CAP_SERVER_URL` de `.env.production.local`).

Desde Capacitor 8, `cap sync ios` sigue usando CocoaPods si `ios/` ya existía
con Podfile. Si regeneras la carpeta, usa `npx cap add ios --packagemanager CocoaPods`
para mantener `App.xcworkspace` (lo que compila Forja).

Compilar y lanzar en un simulador sin abrir Xcode:

```bash
cd apps/mobile/ios/App
xcodebuild -workspace App.xcworkspace -scheme App -configuration Debug \
  -destination 'platform=iOS Simulator,name=iPhone 16' build
```

## Android: Health Connect

Tras `cap add android` (necesita Android Studio / SDK, `minSdk` 26):

1. El plugin `@capgo/capacitor-health` ya declara los permisos de lectura
   (pasos, sueño, pulso en reposo, variabilidad, peso, entrenos) y la pantalla
   de explicación de permisos. Añade en `android/app/src/main/AndroidManifest.xml`
   el permiso de historial (sin él Health Connect solo deja leer ~30 días):

   ```xml
   <uses-permission android:name="android.permission.health.READ_HEALTH_DATA_HISTORY" />
   ```

2. Health Connect exige una política de privacidad. En
   `android/app/src/main/res/values/strings.xml`:

   ```xml
   <string name="health_connect_privacy_policy_url">https://URL-DE-LA-POLITICA</string>
   ```

3. En Android 13 o anterior hay que instalar «Health Connect» desde Play
   Store; la app lo detecta y lo dice en Conexiones.

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
   - **iOS client ID** (tipo "iOS", con el bundle id `es.aj.brio`).
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

- `appId`: `es.aj.brio` · `appName`: `Brío` (en `capacitor.config.ts`).
- El estilo de la status bar (claro/oscuro) se ajusta en caliente desde
  `ThemeProvider` según el tema del usuario.
- La splash se auto-oculta al cargar la web (sin spinner), con fondo greige
  claro y su variante oscura.
