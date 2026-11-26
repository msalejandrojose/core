# Pendiente en el Mac — Brío (26 nov 2026)

> **Primer mensaje para Claude Code en el Mac** (desde la carpeta del repo):
>
> «Haz `git fetch origin claude/loving-curie-7dkfuu && git checkout
> claude/loving-curie-7dkfuu`, lee `PENDIENTE-MAC.md` y guíame paso a paso, en
> orden. Haz tú lo que se pueda hacer desde la terminal y para en cada punto
> donde tenga que hacer algo yo (Xcode, el iPhone, contraseñas). Ve marcando
> los checks de este archivo según avancemos.»

Todo lo de hoy está en la rama **`claude/loving-curie-7dkfuu`** (sale de
`brio-dev`; todavía sin PR). Está probado en la nube (tests de API y móvil en
verde, OTA probada de punta a punta contra una API local), pero **nada se ha
probado en un iPhone** y **el Swift de los widgets no se ha compilado nunca**
(no había Xcode). Es lo que toca hoy.

## Qué hay en la rama

| Commit | Qué |
|---|---|
| `8c2e291` | Hoy: tira de la semana con el icono del deporte y check también hoy y en días sin plan; «Entrenaste N veces» desplegable (descripción) y deslizable (eliminar). API: `workouts` por día en `/brio/plan/week`. |
| `2d2e73c` | Rutinas: reps y kg de cada serie. **Migración** `20261126090000_brio_routine_set_plan`. |
| `4ae86e3` | Botón «Empezar» en Rutinas y en el editor de rutina. |
| `94747c6` | Creador de bocatas: base Burrito y buscador de cualquier ingrediente, sin límite. |
| `f8714a5` | Botón «i» con la ficha del ejercicio (animación + descripción) en el entreno en directo y en el editor de rutinas. |
| `c74c7db` · `17185c0` · `225bc52` · `ef3de84` | **Actualizaciones en caliente (OTA)**: módulo `ota` de la API (**migración** `20261126120000_ota_bundles`), página del backoffice, plugin `@capgo/capacitor-updater` con servidor propio, `pnpm ota:keygen` / `ota:publish` y clave pública. Detalle: `apps/mobile/ota/README.md`. |
| `b5654c1` | **163 ejercicios nuevos** para cubrir el catálogo de Hevy + script `hevy:coverage`. |
| `92851c5` | **Widgets de iOS**: Hoy, Entreno de hoy y Mi semana (App Group `group.es.aj.brio`, esquema `brio://`). Detalle: `apps/mobile/NATIVE.md › widgets`. |

## 0. Antes de empezar

- [x] Tener a mano **`brio-ota-private.pem`** (la clave privada de la OTA, me
      la pasaron por el chat). Es la única copia: guardarla también en el gestor
      de contraseñas. *(Regenerada el 26 nov en el Mac: la buena es
      `apps/mobile/ota/private.pem`; la de `~/Downloads` ya no vale.)*
- [x] `gcloud` con sesión iniciada (despliegue y seed de la API).
- [x] Xcode, y saber con qué **cuenta de Apple** se firma: *(Xcode 27.2; los
      perfiles duran 7 días → cuenta **gratuita**)*
  - **De pago** (Apple Developer Program): todo funciona, se puede subir a
    TestFlight.
  - **Gratuita**: se instala por cable desde Xcode (o Forja). La OTA funciona.
    Los **widgets necesitan App Groups**, que muy probablemente exige la de
    pago: si Xcode no firma con App Groups, quitar la capacidad, sacar el build
    sin widgets (seguirán en «Abre Brío») y dejarlos para cuando haya cuenta de pago.
- [x] `apps/mobile/.env.production.local` con
      `VITE_API_URL=https://brio-api.ajly.online` (y, si se quiere, `OTA_EMAIL`
      / `OTA_PASSWORD` del backoffice para no teclearlos al publicar).
- [x] El proyecto nativo `apps/mobile/ios/` existe (si no: `pnpm --filter
      @core/mobile cap:add:ios`, ver `apps/mobile/NATIVE.md`).

## 1. Rama, dependencias y clave

```bash
git fetch origin claude/loving-curie-7dkfuu && git checkout claude/loving-curie-7dkfuu
pnpm install
cp ~/Downloads/brio-ota-private.pem apps/mobile/ota/private.pem   # ajustar la ruta
chmod 600 apps/mobile/ota/private.pem
git check-ignore apps/mobile/ota/private.pem   # TIENE que imprimir la ruta (= ignorada)
```

- [x] La privada casa con la pública del repo:

```bash
cd apps/mobile && node -e "
const c=require('crypto'),fs=require('fs');
const s=c.privateEncrypt({key:fs.readFileSync('ota/private.pem'),padding:c.constants.RSA_PKCS1_PADDING},Buffer.from('ok'));
console.log(c.publicDecrypt({key:fs.readFileSync('ota/public.pem'),padding:c.constants.RSA_PKCS1_PADDING},s).toString()==='ok'?'✓ claves OK':'✗ NO casan')"; cd ../..
```

> **Opcional, más seguro**: como la privada pasó por el chat, se puede
> regenerar **ahora, antes del build nativo** (`pnpm --filter @core/mobile
> ota:keygen --force`, commit del nuevo `ota/public.pem`, guardar la nueva
> privada). Después del build nativo ya no se debe cambiar.

## 2. Comprobaciones locales

```bash
pnpm --filter @core/api prisma:generate
pnpm --filter @core/api-client generate:offline     # tipos del cliente (construye la API)
pnpm --filter @core/api test -- src/modules/ota src/modules/brio
pnpm --filter @core/mobile test
pnpm --filter @core/mobile exec tsc --noEmit
(cd apps/mobile && pnpm exec cap config --json | grep -A4 CapacitorUpdater)
```

- [x] Tests en verde.
- [x] En `cap config`: `autoUpdate: true` y `updateUrl`
      `https://brio-api.ajly.online/v1/ota/updates`. (Si sale `autoUpdate:
      false`: falta `ota/public.pem` o `VITE_API_URL` no es https.)

## 3. API en producción: PR, despliegue y seed

El despliegue de la API se dispara solo al entrar código en `brio-dev`
(`.github/workflows/deploy-brio-api.yml`: tests → migraciones → Cloud Run).

- [x] Abrir PR `claude/loving-curie-7dkfuu` → **`brio-dev`** *(#278, fusionado)* (si `brio-dev`
      ha avanzado y hay conflictos, resolverlos y repetir el paso 2) y fusionarlo.
- [x] El workflow «Deploy Brío API» acaba en verde (aplica las migraciones
      `set_plan` y `ota_bundle`).
- [x] Seed (sincroniza permisos —crea `ota.bundles`—, crea la sección del
      backoffice y carga los ejercicios nuevos):
      ```bash
      apps/api/deploy/deploy.sh seed
      ```
- [x] El endpoint del plugin responde:
      ```bash
      curl -s -X POST https://brio-api.ajly.online/v1/ota/updates \
        -H 'content-type: application/json' \
        -d '{"app_id":"es.aj.brio","version_name":"builtin","version_build":"1.0.0"}'
      # → {"kind":"up_to_date","error":"no_new_version_available",...}
      ```
- [x] Backoffice contra producción (no se despliega solo; la API admite
      `localhost:5174`):
      ```bash
      VITE_API_URL=https://brio-api.ajly.online pnpm --filter @core/backoffice dev
      ```
      En http://localhost:5174, tras entrar, aparece **Apps móviles ›
      Actualizaciones** (si no: cerrar sesión y volver a entrar; si sigue sin
      salir, revisar que el seed corrió).

## 4. Build nativo (una sola vez: lleva la OTA y los widgets)

1. - [x] Versión de la app en Xcode (*Version* / `MARKETING_VERSION`) **≥
         `minNativeVersion` de `apps/mobile/ota/config.json` (1.0.0)**. Si va
         por debajo (p. ej. 0.9), bajar `minNativeVersion` a esa versión y
         hacer commit.
2. - [x] Web + sync contra producción (instala el pod del plugin de OTA):
         ```bash
         pnpm --filter @core/mobile ios:prod
         ```
3. - [x] Enganchar el nativo propio (Live Activity + widgets, App Group,
         `brio://`). Es idempotente:
         ```bash
         pnpm --filter @core/mobile ios:live-activity
         ```
4. - [x] En Xcode (`pnpm --filter @core/mobile exec cap open ios`), *Signing &
         Capabilities* de los targets **App** y **BrioWidgets**: aparece **App
         Groups** con `group.es.aj.brio` marcado (si no: «+ Capability › App
         Groups» y marcarlo; Xcode lo registra en la cuenta). Ver el punto de la
         cuenta gratuita en el paso 0.
5. - [x] Compilar en el iPhone o el simulador. *(26 nov: compila sin
         errores, widgets incluidos; firmado con la cuenta gratuita y App Group
         en los dos targets.)* **Si hay errores de Swift** en
         `native/ios/` (sobre todo `Widget/BrioHomeWidgets.swift`), pegarlos a
         Claude para que los corrija, hacer commit y volver a compilar.
6. - [x] Instalar en el iPhone: subir el número de build y TestFlight (cuenta de
         pago) o directamente desde Xcode/Forja (gratuita). Abrir la app y
         entrar en **Hoy**.

## 5. Probar la OTA en el iPhone

1. - [x] Cambiar algo visible en la web (p. ej. un texto de Hoy).
2. - [x] Publicar: `pnpm --filter @core/mobile ota:publish --notes "Prueba OTA"`
         (pide el email y la contraseña del backoffice si no están en
         `.env.production.local`).
3. - [x] Backoffice › Actualizaciones: la nueva sale **Sirviéndose**.
4. - [x] iPhone: abrir la app (la baja en segundo plano), mandarla a segundo
         plano unos segundos y volver → se ve el cambio.
5. - [ ] Vuelta atrás: desactivarla en el backoffice, cerrar y abrir la app dos
         veces → vuelve a la versión del build.
6. - [x] Revertir el cambio de prueba en el código.

Si no llega: consola de Xcode filtrando por `CapacitorUpdater` (petición a
`/v1/ota/updates`, descarga, descifrado, checksum).
- Error de `checksum` / `session key` → la privada no casa con la pública que
  lleva la app (paso 1).
- 403 al publicar → falta el seed (paso 3) o el usuario no es admin.
- La app no pregunta → `cap config` da `autoUpdate: false` (paso 2).

## 6. Probar los widgets

1. - [ ] Pantalla de inicio › mantener pulsado › «+» › **Brío**: añadir *Hoy*
         (pequeño y mediano), *Entreno de hoy* y *Mi semana*.
2. - [ ] Hoy: las kcal que quedan coinciden con la app; registrar una comida y
         volver a la pantalla de inicio → se actualiza.
3. - [ ] Entreno de hoy: con algo planificado sale «Empezar»; al tocarlo se abre
         la app y arranca el registro con la rutina del día.
4. - [ ] Mi semana: iconos y checks como la tira de Hoy; al tocar abre el plan.
5. - [ ] Cerrar sesión → los widgets piden «Abre Brío».

Siempre en «Abre Brío» → App Group mal firmado (paso 4.4) o la app no ha
abierto Hoy desde que se instaló.

## 7. Ejercicios: comparar con la lista real de Hevy

La lista de Hevy no es pública; los 163 nuevos salen de su catálogo conocido.
Con la clave de la API de Hevy (Hevy Pro › Ajustes › Developer):

```bash
HEVY_API_KEY=xxxx pnpm --filter @core/api hevy:coverage
```

- [ ] Ver cuántos casan y cuáles no (detalle en `apps/api/hevy-coverage.json`,
      no se sube).
- [ ] Si falta alguno, pedir a Claude: «Añade a
      `apps/api/src/seeds/brio-exercises-hevy.data.ts` los ejercicios de
      `apps/api/hevy-coverage.json` con el mismo formato (nombre en español,
      músculos, descripción, 3 pasos y animación si es variante de uno animado
      en `motions.ts`) y que pase `hevy-catalog.spec.ts`». Después: commit, PR a
      `brio-dev` y `deploy.sh seed` otra vez.

## 8. Repaso de lo nuevo en la app

- [ ] **Hoy › semana**: icono del deporte; check en días entrenados (también
      hoy y días sin plan); punteado en los que no se hicieron.
- [ ] **Hoy › «Entrenaste N veces»**: tocar un entreno abre datos y
      descripción; deslizar a la izquierda muestra «Eliminar» (pide confirmar).
- [ ] **Rutinas**: reps y kg de cada serie; «Empezar» en la lista y en el editor.
- [ ] **Entreno en directo** y **editor de rutina**: botón «i» con la ficha y
      la animación.
- [ ] **Añadir comida › Monta tu bocata…**: base Burrito y buscador.
- [ ] **Ejercicios**: al añadir uno a una rutina salen los nuevos (p. ej.
      «Press Arnold», «Remo Meadows», «Hip thrust en multipower») con su ficha.

## Reglas

- **Nunca** subir `apps/mobile/ota/private.pem` a git ni pegar su contenido en un
  chat, issue o PR.
- No cambiar las claves de la OTA después del build nativo.
- Una web que use algo nativo nuevo (plugin de Capacitor nuevo o actualizado,
  cambios en `capacitor.config.ts`, permisos, Live Activity, widgets) no va por
  OTA: subir `minNativeVersion` en `apps/mobile/ota/config.json` y sacar build
  nativo.
- Al terminar, borrar este archivo (o dejar solo lo que siga pendiente) en el
  mismo PR o en uno nuevo a `brio-dev`.
