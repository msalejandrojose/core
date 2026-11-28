# Pendiente en el Mac: secretos de la OTA y `terraform apply`

> **Para Claude Code en el Mac** (desde la carpeta del repo `core`): guía al
> usuario paso a paso, en orden. Ejecuta tú lo que se pueda desde la terminal y
> para en cada punto donde tenga que hacer algo él (contraseñas, revisar el
> `plan`). Al terminar, dile qué pasarle a la sesión en la nube.

## Contexto (27 nov 2026)

Ya está en `brio-dev` (PRs #281 y #282):

- **OTA desde GitHub Actions** (`.github/workflows/publish-brio-ota.yml`): cada
  push a `brio-dev` que toque la app publica la web como OTA. La clave de firma
  **no está en GitHub**: el workflow la lee de **GCP Secret Manager** con la
  cuenta `github-deploy` (Workload Identity Federation). Faltan esos secretos,
  por eso el primer run (45950383262) falló al leerlos.
- **Despliegue de la API** con una sola imagen, base de dependencias aparte y
  limpieza de imágenes viejas tras cada despliegue correcto. La limpieza falla
  con `PERMISSION_DENIED (artifactregistry.tags.delete)` hasta aplicar
  Terraform, que pasa a `github-deploy` de `artifactregistry.reader` a
  `artifactregistry.repoAdmin` **solo en el repositorio `brio`**.

## Reglas

- **Nunca** mostrar, copiar ni pegar el contenido de `apps/mobile/ota/private.pem`
  (ni en el chat, ni en un commit, issue o PR). Solo se pasa como ruta al script.
- **No hacer `terraform apply` sin enseñar antes el `plan` al usuario** y que
  diga que sí. Si el plan destruye algo que no sea la asignación de IAM de abajo,
  parar y preguntar.
- No cambiar las claves de la OTA (`ota:keygen`): la app del iPhone lleva la
  pública actual.

## 0. Rama al día

```bash
git checkout brio-dev && git pull
```

## 1. Secretos de la OTA en Secret Manager

```bash
gcloud auth login            # solo si gcloud no tiene sesión (cuenta owner de core-502518)
apps/mobile/ota/setup-gcp.sh apps/mobile/ota/private.pem
```

- El script comprueba que la privada casa con `apps/mobile/ota/public.pem`
  (si dice que no casa: parar, la app del iPhone no aceptaría la OTA).
- Pide **email y contraseña del backoffice** (los teclea el usuario; un admin
  vale, mejor un usuario con permiso `ota.bundles`).
- Crea `ota-signing-key` y `ota-publisher-login` y da a
  `github-deploy@core-502518.iam.gserviceaccount.com` el rol
  *Secret Manager Secret Accessor* en los dos.
- Tiene que acabar con «Listo».

- [ ] Secretos creados («Listo»).

## 2. `terraform apply` en brio-dev

```bash
gcloud auth application-default login
export AWS_ACCESS_KEY_ID=…  AWS_SECRET_ACCESS_KEY=…   # token de R2 del estado (bucket core-tfstate), como al montarlo
# y el token de Cloudflare si el provider lo pide, como al montarlo
cd infra/terraform/envs/brio-dev
terraform init -backend-config=backend.hcl
terraform plan
```

Lo esperado en el `plan`:

- `module…google_artifact_registry_repository_iam_member.deployer_reader["this"]`
  **se reemplaza** (role `roles/artifactregistry.reader` → `roles/artifactregistry.repoAdmin`).
- `module…google_cloud_run_v2_job.migrate`: puede salir **sin cambios** o con
  `command = ["/app/node_modules/.bin/prisma"]` y `args = ["migrate", "deploy"]`
  (deploy.sh ya se lo puso al job).
- Nada más. Si sale algo más (sobre todo un *destroy* del servicio, del job, de
  los secretos o de Cloudflare), **no aplicar** y enseñárselo al usuario.

Con el visto bueno del usuario:

```bash
terraform apply
```

- [ ] `terraform apply` hecho.

## 3. Qué pasarle a la sesión en la nube

Que el usuario le diga a la sesión en la nube (la que montó todo esto):

> «Secretos de la OTA creados y terraform aplicado. Relanza el run de la OTA.»

Esa sesión relanza el run **45950383262** (commit `d10d74b`, que lleva el
« · OTA 2» en el saludo de Hoy), comprueba que publica y que en el backoffice
(Apps móviles › Actualizaciones) sale **Sirviéndose**.

Si se quiere hacer desde el Mac en vez de desde la nube, con `gh`:

```bash
gh run rerun 45950383262 --failed --repo msalejandrojose/core
gh run watch --repo msalejandrojose/core $(gh run list --repo msalejandrojose/core --workflow publish-brio-ota.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

## 4. Después (el usuario, con el iPhone)

1. Abrir Brío (la baja en segundo plano), mandarla a segundo plano unos
   segundos y volver → el saludo de Hoy acaba en « · OTA 2».
2. Vuelta atrás (punto 5.5 de `PENDIENTE-MAC.md`): desactivar la versión en el
   backoffice, cerrar y abrir la app dos veces → vuelve sin « · OTA 2».
3. Pedir a la sesión en la nube que quite el « · OTA 2» (un PR a `brio-dev`;
   sirve además para medir el despliegue de ~3 min y publicar una OTA más).
