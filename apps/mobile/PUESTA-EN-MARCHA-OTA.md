# Puesta en marcha: actualizaciones en caliente (OTA) y novedades de Brío en el móvil

> Para lanzar en una sesión de Claude Code **en el Mac** (hace falta Xcode).
> Pega esto como primer mensaje: «Lee `apps/mobile/PUESTA-EN-MARCHA-OTA.md` y
> guíame paso a paso. Para en cada punto donde tenga que hacer algo yo.»

## Contexto (qué hay hecho)

Todo está en la rama **`claude/loving-curie-7dkfuu`** (sale de `brio-dev`, sin PR
todavía). Commits:

| Commit | Qué |
|---|---|
| `8c2e291` | Hoy: tira de la semana con el icono del deporte y check también hoy y en días sin plan; «Entrenaste N veces» desplegable (descripción) y deslizable (eliminar). API: `workouts` por día en `/brio/plan/week`. |
| `2d2e73c` | Rutinas: reps y peso de cada serie. **Migración** `20261126090000_brio_routine_set_plan` (columna `set_plan`). |
| `4ae86e3` | Botón «Empezar» en Rutinas y en el editor de rutina. |
| `94747c6` | Creador de bocatas: base Burrito y buscador para añadir cualquier ingrediente sin límite. |
| `f8714a5` | Botón «i» con la ficha del ejercicio (animación + descripción) en el entreno en directo y en el editor de rutinas. |
| `c74c7db` | **OTA – API**: módulo `apps/api/src/modules/ota`. **Migración** `20261126120000_ota_bundles` (tabla `ota_bundle`). Endpoint público `POST /v1/ota/updates` (formato del plugin de Capgo) y admin `/v1/admin/ota/bundles`. Limpieza de R2: se guardan `OTA_KEEP_BUNDLES` (5) por app. |
| `17185c0` | **OTA – Backoffice**: Apps móviles › Actualizaciones (`/ota/bundles`). |
| `225bc52` | **OTA – App**: plugin `@capgo/capacitor-updater` (servidor propio), `pnpm ota:keygen` / `pnpm ota:publish`, `ota/config.json`, `ota/README.md`. El seed del despliegue sincroniza también las secciones de permisos (`ota.bundles`). |
| `ef3de84` | Clave pública `apps/mobile/ota/public.pem`. |
| `b5654c1` | **163 ejercicios nuevos** para cubrir el catálogo de Hevy (`apps/api/src/seeds/brio-exercises-hevy.data.ts`), con ficha y, 87 de ellos, animación. Script `hevy:coverage` para comparar con la lista real de Hevy. |

Cómo funciona la OTA, el cifrado y la regla de la versión nativa mínima:
`apps/mobile/ota/README.md` (léelo antes de empezar).

**Probado** en el contenedor: tests de API y móvil en verde; publicación real con
el script contra una API local con MySQL; un «teléfono» simulado pidió la
actualización, bajó el zip, lo descifró con la clave pública y la firma cuadró;
la limpieza dejó solo los últimos zips. **No probado**: el plugin dentro de un
iPhone real (es lo que falta hoy).

## 0. Lo que necesito tener a mano

- [ ] El archivo **`brio-ota-private.pem`** (la clave privada, me la pasaron por
      el chat). Es la única copia: tiene que estar en el gestor de contraseñas.
- [ ] `gcloud` con sesión iniciada (para el despliegue y el seed).
- [ ] Xcode y la cuenta de desarrollador para TestFlight.
- [ ] `apps/mobile/.env.production.local` con `VITE_API_URL=https://brio-api.ajly.online`.

## 1. Traer la rama y la clave

```bash
git fetch origin claude/loving-curie-7dkfuu
git checkout claude/loving-curie-7dkfuu
pnpm install
cp ~/Descargas/brio-ota-private.pem apps/mobile/ota/private.pem   # ajusta la ruta
chmod 600 apps/mobile/ota/private.pem
git check-ignore apps/mobile/ota/private.pem   # TIENE que imprimir la ruta (ignorada)
```

Comprobar que la privada casa con la pública del repo:

```bash
cd apps/mobile && node -e "
const c=require('crypto'),fs=require('fs');
const s=c.privateEncrypt({key:fs.readFileSync('ota/private.pem'),padding:c.constants.RSA_PKCS1_PADDING},Buffer.from('ok'));
console.log(c.publicDecrypt({key:fs.readFileSync('ota/public.pem'),padding:c.constants.RSA_PKCS1_PADDING},s).toString()==='ok'?'✓ claves OK':'✗ NO casan')"
```

> **Opcional (más seguro):** como la privada pasó por el chat, se puede
> regenerar ahora, **antes** del build nativo: `pnpm ota:keygen --force`, commit
> del nuevo `ota/public.pem` y guardar la nueva privada. Después del build
> nativo ya no se debe cambiar (las apps instaladas dejarían de aceptar
> actualizaciones hasta otra versión de tienda).

## 2. Comprobaciones locales

```bash
pnpm --filter @core/api test -- src/modules/ota src/modules/brio
pnpm --filter @core/mobile test
pnpm --filter @core/mobile exec tsc --noEmit
cd apps/mobile && pnpm exec cap config --json | grep -A3 CapacitorUpdater
```

En la última, `autoUpdate` tiene que salir `true` y `updateUrl`
`https://brio-api.ajly.online/v1/ota/updates`. Si sale `autoUpdate: false`,
falta `ota/public.pem` o `VITE_API_URL` no es https.

## 3. Desplegar la API (migraciones) y el seed

El despliegue de la API se dispara al entrar código en `brio-dev`
(`.github/workflows/deploy-brio-api.yml`: tests → migraciones → Cloud Run).

1. Abrir PR de `claude/loving-curie-7dkfuu` → **`brio-dev`** y fusionarlo.
2. Esperar a que el workflow «Deploy Brío API» acabe en verde (aplica las dos
   migraciones: `set_plan` y `ota_bundle`).
3. Lanzar el seed (crea la sección del backoffice y el permiso `ota.bundles`,
   y carga los ejercicios nuevos del catálogo):
   ```bash
   apps/api/deploy/deploy.sh seed
   ```
4. Comprobar que el endpoint del plugin responde:
   ```bash
   curl -s -X POST https://brio-api.ajly.online/v1/ota/updates \
     -H 'content-type: application/json' \
     -d '{"app_id":"es.aj.brio","version_name":"builtin","version_build":"1.0.0"}'
   # → {"kind":"up_to_date","error":"no_new_version_available",...}
   ```
5. En el backoffice (despliégalo como siempre), recarga: debe aparecer
   **Apps móviles › Actualizaciones**. Si no aparece, cerrar sesión y volver a
   entrar; si sigue sin salir, revisar que el seed corrió.

## 4. Versión nativa nueva (una sola vez)

Las versiones instaladas no llevan el plugin: hace falta una de tienda.

1. Mirar la versión actual en Xcode (MARKETING_VERSION / «Version»). Tiene que
   ser **≥ `minNativeVersion` de `apps/mobile/ota/config.json` (1.0.0)**. Si la
   app va por debajo (p. ej. 0.9), bajar `minNativeVersion` a esa versión.
2. Build: `pnpm --filter @core/mobile ios:prod` (genera el cliente offline,
   construye y hace `cap sync ios`, que instala el pod del plugin).
3. En Xcode: subir el número de build, Archive y subir a **TestFlight**.
4. Instalar desde TestFlight en el iPhone y abrir la app una vez.

## 5. Prueba de punta a punta en el iPhone

1. Cambiar algo visible en la web (p. ej. el texto de un botón en Hoy).
2. Publicar:
   ```bash
   cd apps/mobile
   pnpm ota:publish --notes "Prueba OTA"
   ```
   Pide email y contraseña del backoffice (o ponerlos en
   `.env.production.local` como `OTA_EMAIL` / `OTA_PASSWORD`, que no se sube).
3. Backoffice › Actualizaciones: la nueva sale como **Sirviéndose**.
4. En el iPhone: abrir la app (la baja en segundo plano), mandarla a segundo
   plano unos segundos y volver a abrirla → debe verse el cambio.
5. **Vuelta atrás**: desactivar esa versión en el backoffice, cerrar y abrir la
   app dos veces → vuelve a la anterior (la de la tienda).
6. Revertir el cambio de prueba en el código.

Si no llega la actualización, depurar con la consola de Xcode (filtrar por
`CapacitorUpdater`): ahí se ve la petición a `/v1/ota/updates`, la descarga,
el descifrado y el checksum. Fallos típicos:
- `checksum` o `session key` → la privada no casa con la pública que lleva la
  app (repetir la comprobación del paso 1).
- 403 al publicar → falta el seed (paso 3.3) o el usuario no es admin.
- La app no pregunta → `cap config` dice `autoUpdate: false` (paso 2).

## 6. Ejercicios: comparar con la lista real de Hevy

La lista de Hevy no es pública; los 163 nuevos salen de su catálogo conocido.
Para ver si falta alguno, con la clave de la API de Hevy (Hevy Pro › Ajustes ›
Developer):

```bash
HEVY_API_KEY=xxxx pnpm --filter @core/api hevy:coverage
```

Dice cuántos casan y lista los que no, con el detalle en
`apps/api/hevy-coverage.json` (no se sube). Si sale alguno, pedir a Claude:
«Añade a `brio-exercises-hevy.data.ts` los ejercicios de
`apps/api/hevy-coverage.json`, con el mismo formato (nombre en español,
músculos, descripción, 3 pasos y animación si es variante de uno animado), y
que pase `hevy-catalog.spec.ts`». Después, nuevo seed (`deploy.sh seed`).

## 7. Probar en el iPhone lo demás que se hizo hoy

- [ ] **Hoy › semana**: iconos del deporte; check en días entrenados (también
      hoy y días sin plan); punteado en días que no se hicieron.
- [ ] **Hoy › «Entrenaste N veces»**: tocar un entreno abre su detalle y
      descripción; deslizar a la izquierda muestra «Eliminar» (pide confirmar).
- [ ] **Rutinas**: editar reps y kg de cada serie; botón «Empezar» en la lista y
      en el editor.
- [ ] **Entreno en directo** y **editor de rutina**: botón «i» abre la ficha con
      la animación.
- [ ] **Añadir comida › Monta tu bocata…**: base Burrito y buscador de
      ingredientes.
- [ ] **Ejercicios**: al añadir ejercicio en una rutina salen los nuevos
      (p. ej. «Press Arnold», «Remo Meadows», «Hip thrust en multipower») con
      su ficha.

## Reglas para no romper nada

- **Nunca** subir `ota/private.pem` a git ni pegar su contenido en un chat o issue.
- No cambiar las claves después del build nativo (ver paso 1).
- Si una web nueva usa algo nativo nuevo (plugin de Capacitor nuevo o
  actualizado, cambios en `capacitor.config.ts`, permisos, Live Activity), subir
  `minNativeVersion` en `ota/config.json` y sacar versión de tienda antes.
