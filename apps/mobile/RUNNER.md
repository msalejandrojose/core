# Runner de GitHub Actions en el Mac Mini

El workflow `Mobile build` (`.github/workflows/mobile-build.yml`) compila Brío
en el Mac Mini con un runner self-hosted. Hace lo mismo que en una terminal del
Mac: `bundle exec fastlane <ios|android> build profile:<perfil>` (ver
`NATIVE.md` › Builds con fastlane). Así se puede lanzar un build desde el
navegador o el móvil, y más adelante desde el backoffice.

## Seguridad: el repo es público

Un runner self-hosted ejecuta en el Mac lo que diga el workflow que le llegue.
En un repo público, una PR de un desconocido podría traer un workflow que pida
este runner. Defensas:

- `mobile-build.yml` solo se lanza a mano (`workflow_dispatch`), nunca por push
  ni por PR.
- **En GitHub, una vez**: Settings › Actions › General › *Fork pull request
  workflows from outside collaborators* → **Require approval for all outside
  collaborators**. Así ningún workflow de una PR ajena corre sin que lo
  apruebes. No aprobar nunca uno que no sea tuyo.
- El runner corre con tu usuario de macOS (lo necesita para la cuenta de Xcode
  y los móviles emparejados). No guardar en el Mac nada que no deba ver un
  build. Las claves (`.p8`, keystore, JSON de Play) en una carpeta propia
  (p. ej. `~/.config/brio/`) y nunca dentro del repo.

## Instalar (una vez)

1. **El Mac despierto y con la sesión iniciada.** Ajustes › Energía: que no
   duerma. Ajustes › Usuarios › inicio de sesión automático con tu usuario. El
   runner es un agente de tu sesión: sin sesión, no hay builds. Bloquear la
   pantalla sí se puede.
2. **Descargar el runner.** En GitHub: Settings › Actions › Runners › *New
   self-hosted runner* › macOS › ARM64. Copiar los comandos de *Download* (crean
   `~/actions-runner`). Hacerlo en una terminal normal, la misma en la que
   funcionan `node`, `pnpm`, `ruby -v` (≥ 3.2) y `bundle`: el runner guarda ese
   `PATH` al configurarse.
3. **Configurarlo** con el token que da esa misma página (caduca en una hora):
   ```bash
   cd ~/actions-runner
   ./config.sh --url https://github.com/msalejandrojose/core --token <TOKEN> \
     --name mac-mini --labels brio-mac --work _work --unattended
   ```
   La etiqueta `brio-mac` es la que pide el workflow.
4. **Variables de los builds** en `~/actions-runner/.env` (una por línea,
   `NOMBRE=valor`). Son las mismas que en `apps/mobile/.env.production.local`:
   ```bash
   APPLE_TEAM_ID=XXXXXXXXXX
   VITE_GOOGLE_WEB_CLIENT_ID=…
   VITE_GOOGLE_IOS_CLIENT_ID=…
   LANG=en_US.UTF-8
   ```
   Con la cuenta de pago se añaden `APPLE_ACCOUNT=paid` y `ASC_KEY_ID`,
   `ASC_ISSUER_ID` y `ASC_KEY_PATH` (ruta al `.p8`). Para Google Play, las
   `ANDROID_*` y `PLAY_SERVICE_ACCOUNT_JSON`. No van a GitHub: el entorno del
   runner pisa los `.env` del repo (`native-config.mjs`).
5. **Arrancarlo como servicio** (agente de launchd de tu usuario: arranca solo
   al iniciar sesión):
   ```bash
   cd ~/actions-runner
   ./svc.sh install
   # svc.sh pone SessionCreate: el runner abre una sesión de seguridad nueva,
   # no ve el llavero de tu sesión y codesign falla con errSecInternalComponent.
   plutil -remove SessionCreate ~/Library/LaunchAgents/actions.runner.msalejandrojose-core.mac-mini.plist
   ./svc.sh start
   ./svc.sh status
   ```
   En Settings › Actions › Runners tiene que salir `mac-mini` como *Idle*.
   Cada vez que se repita `./svc.sh install` hay que volver a quitar
   `SessionCreate`.

Si cambia el `PATH` (otra versión de node o ruby) o el `.env`: editar
`~/actions-runner/.path` o `.env` y `./svc.sh stop && ./svc.sh start`.

## Lanzar un build

Desde GitHub: Actions › Mobile build › *Run workflow*. Ahí se eligen la rama, la
plataforma, el perfil y el móvil. Desde la terminal:

```bash
gh workflow run mobile-build.yml --repo msalejandrojose/core --ref <rama> \
  -f platform=ios -f profile=device -f device="iPhone de Alejandro Jose"
gh run watch --repo msalejandrojose/core
```

- `device` es el nombre o id que da `bundle exec fastlane ios devices`. Con un
  solo iPhone emparejado se puede dejar vacío; los simuladores no cuentan.
- El iPhone tiene que estar en la misma Wi-Fi y desbloqueado al instalar.
- En la página del run quedan el resumen (`last-build.json`) y el artefacto con
  el `.ipa`, `.apk` o `.aab` si lo hay (14 días).
- Los builds van de uno en uno (`concurrency`): si se lanzan dos, el segundo
  espera.
- Con la cuenta gratuita, la firma dura 7 días: basta con relanzar el build
  `device` una vez por semana.

## Si falla

- **El run se queda en «Waiting for a runner»**: el runner no está *Idle*. Mirar
  `./svc.sh status`, que el Mac tenga la sesión iniciada y la red.
- **`node`, `pnpm` o `bundle`: command not found**: el `PATH` guardado no los
  tiene. Corregir `~/actions-runner/.path` y reiniciar el servicio.
- **`errSecInternalComponent` al firmar** (`CodeSign … failed`): el agente
  tiene `SessionCreate` (ver Instalar, paso 5). Quitarlo y reiniciar el servicio.
- **Falla firmando** (`xcodebuild`, *No Accounts* / *No profiles*): Xcode ›
  Settings › Accounts con la sesión iniciada, en el mismo usuario que el runner.
- **No encuentra el iPhone**: `bundle exec fastlane ios devices` en una terminal
  del Mac. Si ahí tampoco sale, repetir el emparejado por red (`NATIVE.md`).
- **`faltan variables: APPLE_TEAM_ID`**: falta en `~/actions-runner/.env`, o el
  servicio no se reinició después de añadirla.
- Logs del runner: `~/actions-runner/_diag/`.
