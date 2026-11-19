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

## iOS: ajustes tras `cap add ios` (probado con Xcode 26)

`ios/` no se versiona, así que estos ajustes hay que repetirlos al regenerarla:

1. **Versión mínima iOS 15.** El Xcode actual no compila para simulador por
   debajo de 15 y el plugin de login social pide 14. En `ios/App/Podfile`:

   ```ruby
   platform :ios, '15.0'
   ...
   post_install do |installer|
     assertDeploymentTarget(installer)
     installer.pods_project.targets.each do |target|
       target.build_configurations.each do |config|
         config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
       end
     end
   end
   ```

   y `IPHONEOS_DEPLOYMENT_TARGET = 15.0` en `ios/App/App.xcodeproj/project.pbxproj`.
2. **CocoaPods necesita UTF-8**: `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`
   antes de `cap sync ios` / `pod install`.
3. **Backend de pruebas por `http`** (IP de ZeroTier o red local): iOS bloquea
   `http` salvo excepción. Solo para pruebas, en `ios/App/App/Info.plist`:
   `NSAppTransportSecurity` → `NSAllowsArbitraryLoads` = `YES`. Quitarlo antes
   de publicar en la App Store (la API de producción irá por `https`).
4. Usar el pnpm del repo (`packageManager`, 10.x): con otra versión mayor,
   `pnpm add` falla por la ubicación del store. `npx pnpm@10.11.0 …` sirve.

5. **Apple Salud (HealthKit).** En `ios/App/App/Info.plist`:

   ```xml
   <key>NSHealthShareUsageDescription</key>
   <string>Brío lee tu sueño, pulso en reposo, variabilidad, pasos, peso y entrenos para ajustar tu plan y tus calorías.</string>
   <key>NSHealthUpdateUsageDescription</key>
   <string>Brío no escribe en Salud; el sistema pide este texto igualmente.</string>
   ```

   y el permiso de HealthKit: crea `ios/App/App/App.entitlements` con
   `com.apple.developer.healthkit` = `true` y
   `com.apple.developer.healthkit.access` = array vacío, y en
   `project.pbxproj` añade `CODE_SIGN_ENTITLEMENTS = App/App.entitlements;` a
   las dos configuraciones del target `App` (junto a `PRODUCT_BUNDLE_IDENTIFIER`).
   Al firmar con `-allowProvisioningUpdates` (Xcode o Forja) el perfil se
   regenera con HealthKit.

6. **Abrir Hevy desde Brío** (rutinas de gimnasio). En `ios/App/App/Info.plist`,
   `LSApplicationQueriesSchemes` (array) con `hevy`: sin él iOS no deja
   comprobar si Hevy está instalada y Brío abre hevy.com en su lugar.

7. **Login con Apple** (obligatorio en la App Store si se ofrece Google).
   Necesita cuenta de desarrollador **de pago**: con la gratuita la app no
   firma si lleva la capacidad. Cuando la tengas:
   - en `ios/App/App/App.entitlements`, `com.apple.developer.applesignin` =
     array con `Default`;
   - en el App ID (developer.apple.com) activa «Sign in with Apple»;
   - en `apps/mobile/.env.production.local`, `VITE_APPLE_SIGN_IN=true`.
   La API acepta tokens con `aud` = `APPLE_CLIENT_ID` (por defecto `es.aj.brio`).

8. **Escanear códigos de barras** (`@capacitor/barcode-scanner`). En
   `ios/App/App/Info.plist`, `NSCameraUsageDescription` = «Brío usa la cámara
   para leer el código de barras de los alimentos.» (sin ella iOS cierra la
   app al abrir la cámara).

9. **Nombre en los avisos del sistema**: en `ios/App/App/Info.plist`,
   `CFBundleName` = `Brío` (por defecto es `$(PRODUCT_NAME)` = «App», y avisos
   como el de iniciar sesión con Google dicen «App quiere usar…»).

10. **Hablar al coach** (mantener el botón central de la barra;
   `@capacitor-community/speech-recognition`). En `ios/App/App/Info.plist`:
   - `NSMicrophoneUsageDescription` = «Brío usa el micrófono para que le cuentes
     al coach lo que has comido o entrenado.»
   - `NSSpeechRecognitionUsageDescription` = «Brío pasa a texto lo que le dices
     al coach para apuntarlo.»
   Sin las dos, iOS cierra la app al empezar a escuchar. Después, `cap sync ios`
   para que CocoaPods instale el plugin.

## iOS: Live Activity del entreno en vivo

La pantalla bloqueada y la Dynamic Island enseñan el entreno de gimnasio en
curso (ejercicio, serie, peso, repes y descanso) con botones que funcionan sin
desbloquear: ✓ serie hecha, ±2,5 kg, ±1 repe, ejercicio anterior/siguiente y
saltar descanso. Requiere iOS 17 (la app sigue funcionando en 15; solo no sale).

Como `ios/` no se commitea, el código nativo vive en `native/ios/` y un script
lo engancha al proyecto de Xcode. Tras `cap add ios` (o en un proyecto que no
lo tenga), una vez:

```bash
pnpm --filter @core/mobile ios:live-activity
```

Hace, de forma idempotente: crea el target `BrioWidgets` (extensión WidgetKit,
bundle `es.aj.brio.widgets`), añade `native/ios/Shared` (modelo e intents) a la
app y a la extensión, `native/ios/App` (plugin y controlador) a la app, pone
`NSSupportsLiveActivities` en el Info.plist y apunta Main.storyboard a
`BrioBridgeViewController`, que registra el plugin `BrioLiveActivity`.

Cómo funciona: la web manda el estado completo al plugin (`useLiveActivitySync`,
montado en `TabsShell`); los botones son `LiveActivityIntent`, que iOS ejecuta
en el proceso de la app aunque esté bloqueada: actualizan la actividad y dejan
el estado pendiente, que la web recoge (`takeChanges`) al instante si está viva
o al volver a la app. Con la cuenta gratuita de Apple funciona igual (no usa
App Groups ni push).

## Instalar la app normal (contra la API de Cloud Run)

```bash
pnpm --filter @core/mobile ios:prod
```

Compila la web contra la API de producción
(`https://brio-api-653444001481.europe-west1.run.app`) y hace `cap sync ios`
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
