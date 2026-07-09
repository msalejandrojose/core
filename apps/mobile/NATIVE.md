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

## Notas

- `appId`: `es.aj.core` · `appName`: `Core` (en `capacitor.config.ts`).
- El estilo de la status bar (claro/oscuro) se ajusta en caliente desde
  `ThemeProvider` según el tema del usuario.
- La splash se auto-oculta al cargar la web (sin spinner), con fondo greige
  claro y su variante oscura.
