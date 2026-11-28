# Pendiente en el Mac — builds nativos (28 nov 2026)

> **Primer mensaje para Claude Code en el Mac** (desde la carpeta del repo):
>
> «Haz `git fetch origin claude/ios-android-deployment-plan-ptixhi && git checkout
> claude/ios-android-deployment-plan-ptixhi`, lee `PENDIENTE-MAC-BUILDS.md` y
> guíame paso a paso, en orden. Haz tú lo que se pueda hacer desde la terminal y
> para en cada punto donde tenga que hacer algo yo (Xcode, el iPhone,
> contraseñas). Ve marcando los checks de este archivo según avancemos y haz
> commit en esta misma rama.»

## De dónde venimos

El objetivo: compilar iOS y Android en el Mac Mini, instalar en un móvil de la
misma Wi-Fi y subir a TestFlight y a las tiendas, y más adelante lanzarlo todo
desde el backoffice. Plan por pasos:

| Paso | Estado |
|---|---|
| 1. Backoffice en Cloudflare Pages (`deploy-backoffice.yml`) | Hecho, sin fusionar |
| 2. `apps/mobile/native.config.yml`: toda la config nativa en un fichero | Hecho |
| 3. `pnpm native:prepare`: genera `ios/` y `android/` desde el YAML | Hecho, probado en Linux, **falta el Mac** |
| 4. `apps/mobile/fastlane/Fastfile`: instalar en el móvil y subir a tiendas | Hecho, **sin probar** |
| 5. Runner self-hosted de GitHub Actions en el Mac + `mobile-build.yml` | Pendiente |
| 6. API + página «Builds» en el backoffice | Pendiente |
| 7. TestFlight, App Store y Google Play | Cuando haya cuentas de pago |

**Hoy toca validar los pasos 3 y 4 en el Mac.** En la nube se probó todo lo
posible: `ios/` se genera entero (Info.plist, entitlements, Podfile, proyecto de
Xcode con la extensión BrioWidgets), pero sin `pod install` ni compilar; el
lane de Android llega a Gradle y allí se paró por la red de la nube. Nada de
esto se ha ejecutado todavía en macOS.

Documentación: `apps/mobile/NATIVE.md`, en las dos primeras secciones
(`native.config.yml` + `native:prepare` y «Builds con fastlane»).

## 0. Antes de empezar

- [x] Rama `claude/ios-android-deployment-plan-ptixhi` y dependencias:
      ```bash
      git fetch origin claude/ios-android-deployment-plan-ptixhi
      git checkout claude/ios-android-deployment-plan-ptixhi
      pnpm install
      ```
      `pnpm install` ahora compila `sharp` (lo usan los iconos y el splash; se
      añadió a `onlyBuiltDependencies`). Si `native:prepare` falla luego en
      `capacitor-assets` con «Something went wrong installing the sharp
      module», ejecutar `pnpm rebuild sharp` o `pnpm install --force`.
      > **28 nov, en el Mac:** `pnpm install` dijo «Already up to date» y no
      > compiló nada, y `pnpm rebuild sharp` solo recompiló `sharp@0.34.5`;
      > `@capacitor/assets` usa `sharp@0.32.6`. Lo que funcionó:
      > `cd node_modules/.pnpm/sharp@0.32.6/node_modules/sharp && npm run install`.
- [x] Guardar el proyecto iOS que funciona (no borrarlo hasta el final):
      ```bash
      mv apps/mobile/ios apps/mobile/ios.bak
      ```
- [x] El Team ID con el que se firma hoy:
      ```bash
      grep -m1 DEVELOPMENT_TEAM apps/mobile/ios.bak/App/App.xcodeproj/project.pbxproj
      ```
      Ponerlo en `apps/mobile/.env.production.local` (no se commitea):
      `APPLE_TEAM_ID=XXXXXXXXXX`. La cuenta es la gratuita, así que **no**
      poner `APPLE_ACCOUNT=paid`.
- [x] Si `.env.production.local` tiene `VITE_GOOGLE_IOS_CLIENT_ID`, se usa para
      el esquema de URL del login con Google. Si no lo tiene, sale un aviso:
      es normal.
- [x] La config se resuelve sin errores:
      ```bash
      pnpm --filter @core/mobile native:config --profile device --platform ios
      ```

## 1. `native:prepare` contra el `ios/` que funciona

- [x] Generar:
      ```bash
      pnpm --filter @core/mobile native:prepare --profile device --platform ios
      ```
      Ahora sí tiene que hacer `pod install` (con CocoaPods instalado). Si
      falla en el script de Ruby por `xcodeproj`, se instala con
      `gem install xcodeproj` (o se ejecuta dentro de `bundle exec`, ver el
      paso 2).
- [x] Comparar con el que funcionaba:
      ```bash
      cd apps/mobile
      for f in App/App/Info.plist App/App/App.entitlements; do
        echo "== $f"; diff <(plutil -convert xml1 -o - ios.bak/$f) <(plutil -convert xml1 -o - ios/$f)
      done
      cd ../..
      ```
      Lo que esté en `ios.bak` y no en `ios` hay que **pasarlo a
      `apps/mobile/native.config.yml`** (no a `ios/` a mano) y volver a generar.
      Diferencias esperables que no hay que copiar:
      - `NSAppTransportSecurity`: solo va en el perfil `mac` (ZeroTier por http).
      - El orden de las claves y el formato.
      > **28 nov, en el Mac:** Info.plist igual salvo lo esperable (ATS, orden
      > y `CFBundleURLName`), más dos cosas:
      > - Falta `GIDClientID`: no hace falta, `social-auth.ts` le pasa
      >   `iOSClientId` al plugin desde `VITE_GOOGLE_IOS_CLIENT_ID`.
      > - Aparece `UIApplicationSceneManifest`: la plantilla actual de
      >   Capacitor 8 usa escenas y `SceneDelegate.swift` creaba la ventana con
      >   un `CAPBridgeViewController()` a pelo, saltándose el storyboard (y con
      >   él los plugins de widgets y Live Activity). Arreglado en
      >   `native-prepare.mjs` (`patchSceneDelegate`, con test).
      >
      > Entitlements, team, bundle ids y deployment targets iguales. Compila sin
      > firmar con `xcodebuild` (App + BrioWidgets).
- [x] Revisar también los build settings que no salen en el diff:
      ```bash
      cd apps/mobile
      for f in ios.bak ios; do echo "== $f"; grep -E "DEVELOPMENT_TEAM|PRODUCT_BUNDLE_IDENTIFIER|IPHONEOS_DEPLOYMENT_TARGET|CODE_SIGN_ENTITLEMENTS|MARKETING_VERSION" $f/App/App.xcodeproj/project.pbxproj | sort | uniq -c; done
      cd ../..
      ```
      El nuevo pone `MARKETING_VERSION = 1.0.0` y un número de build grande
      (minutos desde el 1-1-2026); es lo que se quiere.
- [x] Compilar en Xcode para ver que el proyecto generado está bien antes de
      meter fastlane por medio:
      ```bash
      pnpm --filter @core/mobile exec cap open ios
      ```
      En *Signing & Capabilities* de **App** y **BrioWidgets**: team correcto,
      HealthKit y App Groups (`group.es.aj.brio`). Compilar en el iPhone.
      **Si hay errores**, pegarlos a Claude. El arreglo va en
      `native.config.yml`, `scripts/native-prepare.mjs` o
      `scripts/ios-project.rb`, nunca en `ios/` a mano. Commit y regenerar.

## 2. fastlane

- [x] Ruby ≥ 3.2 (el de macOS es 2.6; fastlane 2.242 no arranca con él):
      ```bash
      brew install ruby
      brew info ruby        # dice qué línea añadir al PATH (~/.zshrc)
      ruby -v               # tiene que ser ≥ 3.2 en una terminal nueva
      ```
      > **28 nov:** ya había Ruby 3.3.0 con rbenv; no hizo falta brew.
      > CocoaPods pide `export LANG=en_US.UTF-8` (aviso, no falla).
- [x] Instalar fastlane con las versiones del `Gemfile.lock`:
      ```bash
      cd apps/mobile && bundle install && bundle exec fastlane lanes && cd ../..
      ```
      Tienen que salir `ios devices`, `ios build`, `android devices` y
      `android build`. El `Gemfile.lock` se generó en Linux con plataformas de
      macOS añadidas; si `bundle install` lo cambia, hacer commit del nuevo.
- [x] El iPhone, por Wi-Fi: conectarlo **una vez por cable**, en Xcode ›
      Window › Devices and Simulators seleccionarlo y marcar «Connect via
      network». Modo desarrollador activado en el iPhone. Desconectar el cable.
- [x] Ver que el Mac lo encuentra por la red:
      ```bash
      cd apps/mobile && bundle exec fastlane ios devices
      ```
      El iPhone tiene que salir con `localNetwork` (con `wired` si sigue el
      cable). Si no sale: misma Wi-Fi, iPhone desbloqueado, y repetir el
      emparejado.
      > **28 nov:** sale «iPhone de Alejandro Jose · localNetwork» (ya estaba
      > emparejado por red), junto a los simuladores (`sameMachine`), así que
      > hay que pasar `device:"iPhone de Alejandro Jose"`.
- [x] Compilar e instalar en el iPhone sin cable:
      ```bash
      bundle exec fastlane ios build profile:device
      # con varios dispositivos: … device:"iPhone de …"
      ```
      Tiene que compilar, instalar y abrir Brío. Queda
      `native-build/last-build.json` con el resultado.
      > **28 nov:** la primera vez falló en `pod install`: dentro de
      > `bundle exec` no se ve el `pod` del sistema. Se añadió `cocoapods` al
      > `Gemfile`. Después compiló (Release, firma automática con la cuenta
      > gratuita), instaló por Wi-Fi y abrió Brío 1.0.0 (476768). Se saltó la
      > prueba en Xcode: el proyecto ya compilaba con `xcodebuild`.
- [ ] En el iPhone: la app abre contra la API de producción y los datos siguen
      ahí (mismo bundle id y team, se instala encima). Widgets, Live Activity y
      Salud funcionan.

Errores probables y dónde mirar:
- `devicectl` no encuentra el dispositivo o no instala → el emparejado por
  red (paso anterior) o Xcode sin la cuenta iniciada (Settings › Accounts).
- `xcodebuild` falla firmando → el team (`APPLE_TEAM_ID`) o, con la cuenta
  gratuita, alguna capacidad que no admite (avisar a Claude: se mueve a
  `ios.paidAccountOnly` en el YAML).
- Pegar a Claude la salida completa del lane: los arreglos van en
  `apps/mobile/fastlane/Fastfile` o en el YAML.

## 3. Android (opcional hoy, si está Android Studio)

- [ ] Android Studio instalado con el SDK (`~/Library/Android/sdk`). El
      Fastfile usa su JDK si `JAVA_HOME` no está definido.
- [ ] APK de debug:
      ```bash
      cd apps/mobile && bundle exec fastlane android build profile:device
      ```
      Queda `native-build/Brio-1.0.0-<build>.apk`.
- [ ] Instalarlo en un Android por Wi-Fi (opcional): en el móvil, Opciones de
      desarrollador › Depuración inalámbrica; `adb pair <ip:puerto>` y
      `adb connect <ip:puerto>`; luego
      `bundle exec fastlane android build profile:device device:<ip:puerto>`.

## 4. Cerrar

- [ ] Si todo va: borrar `apps/mobile/ios.bak`.
- [ ] Pedir a Claude que quite lo que ya sobra (en la misma rama):
      `scripts/ios-live-activity.rb`, el script `ios:live-activity` del
      `package.json` y los pasos manuales de iOS de `NATIVE.md` que ya hace
      `native:prepare`.
- [ ] Commit y push de la rama con los checks marcados.
- [ ] Cuando terminen los cambios de infra que hay en marcha en `brio-dev`:
      PR de esta rama → **`brio-dev`**. Al fusionar se despliega el backoffice en
      Pages por primera vez (crea el proyecto `brio-backoffice`) y se vuelve a
      desplegar la API (cambia el CORS en `apps/api/deploy/cloudrun.env.yaml`).
      Si Pages le da otra URL que `brio-backoffice.pages.dev` (nombre cogido),
      corregir el CORS con la que salga en el log del workflow.
- [ ] Siguiente sesión: paso 5, el runner self-hosted en el Mac.

## Reglas

- **No tocar `ios/` ni `android/` a mano**: se regeneran en cada build. Todo
  ajuste nativo va a `apps/mobile/native.config.yml` (o a `native/ios/` si es
  código Swift).
- **Nunca** subir a git ni pegar en un chat: claves `.p8`, keystores,
  contraseñas, el JSON de la cuenta de servicio de Play, `ota/private.pem`.
  En el YAML solo se nombran las variables; los valores van en
  `.env.production.local` o en el entorno, y los ficheros fuera del repo.
- Con la cuenta gratuita la firma dura 7 días: cada semana hay que volver a
  ejecutar `fastlane ios build profile:device` (no hace falta cable).
