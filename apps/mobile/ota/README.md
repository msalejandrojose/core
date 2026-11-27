# Actualizaciones en caliente (OTA)

Cambios de la web de la app (pantallas, estilos, lógica en TypeScript) sin pasar
por la App Store / Play. La app lleva el plugin `@capgo/capacitor-updater`
apuntando a **nuestra** API (no al servicio de Capgo):

1. `pnpm ota:publish` construye la web, la empaqueta en un zip, la **cifra** y
   la sube a la API (`POST /v1/admin/ota/bundles`), que la guarda en R2.
2. Al abrir la app, el plugin pregunta a `POST /v1/ota/updates`. Si hay una
   versión nueva para su versión nativa, se la baja de R2 (URL firmada, 1 h).
3. La descifra, comprueba la firma y la aplica la próxima vez que la app pasa a
   segundo plano. Si la nueva no arranca (no llega `notifyAppReady` en 10 s),
   vuelve sola a la anterior.

En el backoffice, **Apps móviles › Actualizaciones**: qué se ha subido por app,
cuál se está sirviendo, desactivar una (los teléfonos vuelven a la anterior) y
borrar zips. Se guardan las `OTA_KEEP_BUNDLES` últimas (5) por app y canal; al
subir una nueva se borran de R2 las que sobran, nunca una que todavía se sirve
a alguna versión nativa. Hay además una limpieza diaria de respaldo.

## Cifrado

Cada zip va cifrado con AES-128-CBC y una clave aleatoria. Esa clave y el
SHA-256 del zip se firman con tu **clave privada** (RSA-2048); la app lleva la
**pública** (`ota/public.pem`) y solo instala lo que esté firmado con tu clave
privada. Ni la API ni R2 pueden fabricar una actualización válida.

Ojo con lo que garantiza: la clave pública va dentro de la app, así que quien
tenga la app puede descifrar los zips (que son la misma web que ya lleva la
app). Lo que impide es que alguien meta una web modificada.

## Puesta en marcha (una vez)

```bash
cd apps/mobile
pnpm ota:keygen        # crea ota/public.pem (al repo) y ota/private.pem (NO)
```

- Guarda `ota/private.pem` en tu gestor de contraseñas. Si la pierdes, no
  podrás publicar más actualizaciones hasta sacar una versión nativa con una
  clave nueva. Puedes tenerla fuera del repo con `OTA_PRIVATE_KEY_PATH`.
- Haz commit de `ota/public.pem` y saca un **build nativo nuevo** (`pnpm
  ios:prod` + TestFlight/App Store): las versiones ya instaladas no llevan el
  plugin. Sin `ota/public.pem` el plugin queda apagado.
- En la API: desplegar (migración `ota_bundle`) y lanzar el job de seed
  (`deploy.sh seed`), que crea la sección y su permiso `ota.bundles`.

## Publicar

```bash
pnpm ota:publish --notes "Arregla el registro de entrenos"
```

Pide el email y la contraseña del backoffice (o los lee de `OTA_EMAIL` /
`OTA_PASSWORD` en `.env.production.local`, que no se sube). La API es la de
`VITE_API_URL`. Otras opciones: `--dry-run` (lo deja en `ota/out/` sin
subir), `--skip-build`, `--version`, `--channel`, `--min-native`.

## Publicar con un push a `brio-dev` (GitHub Actions)

`.github/workflows/publish-brio-ota.yml` hace lo mismo que `pnpm ota:publish`
sin el Mac: **cada push a `brio-dev` que toque la app se publica** (lo que entra
al fusionar un PR). Las notas del backoffice son la primera línea del commit.
Antes de publicar:

- comprueba que desde la última OTA no cambia nada nativo (plugins de
  Capacitor, `capacitor.config.ts`, `native/`, parches) sin subir
  `minNativeVersion` (`scripts/ota-ci-check.sh`). Si lo hay, no publica y deja
  un aviso en el run. Si el cambio nativo no afecta a la web (p. ej. solo el
  Swift de un widget), un commit con `[ota-native-ok]` lo deja pasar;
- pasa los tests de la app;
- si el mismo push despliega la API, espera a que acabe bien.

Al publicar mueve la etiqueta `ota/es.aj.brio` a ese commit: es la «última
OTA» con la que compara el siguiente push. Para no publicar un push concreto:
`[skip ota]` en el mensaje del commit.

**La clave no está en GitHub**: está en **GCP Secret Manager**
(`ota-signing-key`, más `ota-publisher-login` con el usuario del backoffice) y
el workflow la lee al vuelo con Workload Identity Federation, con la cuenta
`github-deploy` de la API. Esa identidad solo se concede a ejecuciones de
`brio-dev` de este repo. **Una sola clave para todas las apps**: una app nueva
lleva el mismo `ota/public.pem` y lee el mismo secreto.

Puesta en marcha, una vez, desde un equipo con `gcloud` y la clave (el Mac o
Cloud Shell):

```bash
apps/mobile/ota/setup-gcp.sh path/to/private.pem
```

Comprueba que la privada casa con `ota/public.pem`, crea los dos secretos y da
acceso a `github-deploy`. Sin terminal, también se puede desde la consola de
GCP › Secret Manager: `ota-signing-key` con el contenido del `.pem` y
`ota-publisher-login` con dos líneas `OTA_EMAIL=…` / `OTA_PASSWORD=…`, y en
cada uno dar a `github-deploy@core-502518.iam.gserviceaccount.com` el rol
*Secret Manager Secret Accessor*. Para el usuario, mejor uno propio del
backoffice con solo el permiso `ota.bundles` que un admin.

## Versión nativa mínima

`ota/config.json › minNativeVersion` dice qué versión de la tienda necesita la
web que publicas. **Súbela cuando la web use algo nativo nuevo** (un plugin de
Capacitor nuevo o actualizado, cambios en `capacitor.config.ts`, permisos, la
Live Activity…): esa web solo la recibirán los teléfonos con esa versión de la
tienda o más; los demás se quedan con la última que les sirve. Si cambias
código nativo, lo que toca es una versión de tienda, no una OTA.

Al instalar una versión nueva de la tienda, la app usa la web que trae y olvida
las bajadas anteriores (`resetWhenUpdate`).
