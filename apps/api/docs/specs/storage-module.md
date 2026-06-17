# Spec — Módulo `storage` (gestión de ficheros)

> Estado: **borrador / pendiente de implementar**
> Owner: backend
> Última edición: 2026-06-15

## 1. Objetivo

Disponer en `@core/api` de un **módulo único** que permita subir, descargar,
listar y borrar ficheros, con dos características clave:

1. **La misma API pública** (puerto) se usa en local, pre y pro. Lo único que
   cambia es el adapter inyectado vía DI.
2. **Todos los ficheros subidos quedan registrados en BBDD** en una tabla
   `stored_file`. La tabla NO almacena el binario — solo metadata (nombre
   original, key en el bucket / ruta en disco, tamaño, mime, hash, owner,
   etc.). El binario vive en el backend de almacenamiento.

Esto sigue el mismo patrón ya establecido por el módulo `mailer`
([mailer.module.ts](../../../src/modules/mailer/mailer.module.ts)): un port en
`application/ports`, varios adapters en `infrastructure/adapters`, selección
del adapter en el `*.module.ts` según env.

## 2. Driver model

El módulo expone un único `StoragePort`. La implementación concreta se elige
con la env var `STORAGE_DRIVER`:

| `STORAGE_DRIVER` | Adapter | Cuándo |
|---|---|---|
| `local` | `LocalDiskStorageAdapter` | Desarrollo en máquina del dev. Guarda en `<repo>/.storage/` (gitignored). |
| `s3` | `S3StorageAdapter` | AWS S3 o cualquier servicio S3-compatible (MinIO, R2, B2…). |
| `gcs` | `GcsStorageAdapter` | Google Cloud Storage. |

Por defecto en `apps/api/.env.local`: `STORAGE_DRIVER=local`.
En pre/pro la pipeline inyecta `STORAGE_DRIVER=s3` (o `gcs`) + las creds del
provider.

> **Decisión:** empezamos con S3 + local. GCS queda definido en el spec pero
> su implementación se pospone hasta que haya necesidad real. La forma del port
> ya asume que añadir GCS no tocará nada de application/domain.

## 3. Puerto

```ts
// apps/api/src/modules/storage/application/ports/storage.port.ts

export interface PutObjectInput {
  /** Ruta lógica dentro del bucket. Ej: "avatars/users/{uuid}.png" */
  key: string;
  body: Buffer | NodeJS.ReadableStream;
  contentType: string;
  /** Bytes. Si no se conoce de antemano (stream), null. */
  size?: number;
  /** Metadata custom — se pasa al backend (S3 x-amz-meta-*, GCS metadata). */
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  key: string;
  /** Hash del contenido devuelto por el backend (S3 ETag, GCS md5, sha256 local). */
  checksum: string;
  size: number;
}

export interface GetObjectResult {
  body: NodeJS.ReadableStream;
  contentType: string;
  size: number;
}

export interface SignedUrlOptions {
  /** Segundos de validez. */
  expiresInSec: number;
  /** "get" para descarga, "put" para subida directa cliente → bucket. */
  operation: 'get' | 'put';
  /** Solo para "put": contentType esperado, se firma. */
  contentType?: string;
}

export interface StoragePort {
  put(input: PutObjectInput): Promise<PutObjectResult>;
  get(key: string): Promise<GetObjectResult>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** URL temporal para que el cliente lea/escriba directo, sin pasar por la API. */
  getSignedUrl(key: string, options: SignedUrlOptions): Promise<string>;
}

export const STORAGE_PORT = 'STORAGE_PORT';
```

### Notas de diseño del puerto

- **`key` es lógica, no física.** El adapter local la mapea a `path.join(rootDir, key)`. El adapter S3 la usa tal cual como object key. Cada adapter normaliza el separador (`/` siempre, nunca `\`).
- **No exponemos URL pública en `put`/`get`.** La URL la decide quien consume el fichero, vía `getSignedUrl` (o vía endpoint de la API que hace stream). Esto evita acoplar el dominio a un esquema de URL.
- **`getSignedUrl` en local** devuelve una URL apuntando al endpoint `/files/:id/raw?token=…` de la propia API (token firmado con `JWT_SECRET`, TTL). En S3/GCS devuelve la URL presignada nativa.
- **No hay `list()` en el port.** El listado se hace contra la tabla `stored_file` en BBDD, que es la fuente de verdad para "qué ficheros hay". El bucket NO se inspecciona como índice.

## 4. Adapters

### 4.1 `LocalDiskStorageAdapter`

- Root: `STORAGE_LOCAL_ROOT` (default: `<repo>/.storage`).
- Crea `.storage/` si no existe en `onModuleInit`.
- `.storage/` está en `.gitignore` (añadir).
- `put`: escribe en `${root}/${key}`, calcula `sha256` mientras escribe (stream).
- `get`: devuelve `createReadStream`.
- `delete`: `fs.rm` con `force: true` (no falla si no existe).
- `getSignedUrl`: genera un JWT corto (`{ key, op, exp }`) firmado con `JWT_SECRET`. La API expone `GET /files/raw?token=…` que verifica y hace stream.

### 4.2 `S3StorageAdapter`

- Dep: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
- Config:
  - `STORAGE_S3_BUCKET` (obligatoria)
  - `STORAGE_S3_REGION`
  - `STORAGE_S3_ENDPOINT` (opcional, para MinIO/R2 — si se omite, usa el endpoint AWS estándar)
  - `STORAGE_S3_FORCE_PATH_STYLE=true|false` (necesario para MinIO)
  - Credenciales: usa el provider chain estándar de AWS (env, profile, IAM role). NO instanciamos `accessKeyId`/`secretAccessKey` manualmente salvo que se definan explícitamente como `STORAGE_S3_ACCESS_KEY_ID` / `STORAGE_S3_SECRET_ACCESS_KEY`.
- `getSignedUrl` usa `getSignedUrl` de `@aws-sdk/s3-request-presigner` con `GetObjectCommand` o `PutObjectCommand`.

### 4.3 `GcsStorageAdapter` (placeholder — implementar cuando haga falta)

- Dep: `@google-cloud/storage`.
- Config:
  - `STORAGE_GCS_BUCKET`
  - `STORAGE_GCS_PROJECT_ID`
  - `STORAGE_GCS_KEY_FILE` (path al service account JSON; opcional si se corre con ADC).
- `getSignedUrl` usa `file.getSignedUrl({ action, expires })`.

## 5. Modelo de datos — `StoredFile`

Tabla nueva en [schema.prisma](../../prisma/schema.prisma):

```prisma
/// Registro de ficheros gestionados por el módulo `storage`. NO almacena
/// el binario — solo la metadata necesaria para localizar el fichero en
/// el backend de almacenamiento (bucket o disco local) y para auditoría.
model StoredFile {
  id           String   @id @default(uuid()) @db.Char(36)
  /// Key/ruta lógica dentro del backend de almacenamiento. Idéntica
  /// independientemente del driver. Ej: "avatars/users/{userId}.png".
  storageKey   String   @unique @map("storage_key") @db.VarChar(1024)
  /// Driver con el que se subió. Útil para auditoría / migraciones.
  driver       String   @db.VarChar(32) // "local" | "s3" | "gcs"
  /// Nombre original que subió el usuario (para mostrar / descargar).
  originalName String   @map("original_name") @db.VarChar(512)
  contentType  String   @map("content_type") @db.VarChar(255)
  size         BigInt
  /// Hash del contenido (sha256 hex / S3 ETag / GCS md5 según adapter).
  checksum     String   @db.VarChar(128)
  /// Etiqueta libre para agrupar usos: "avatar", "invoice-pdf", etc.
  purpose      String?  @db.VarChar(64)
  /// Usuario que subió el fichero. Nullable para subidas de sistema.
  uploadedById String?  @map("uploaded_by_id") @db.Char(36)
  uploadedBy   User?    @relation(fields: [uploadedById], references: [id], onDelete: SetNull)

  createdAt    DateTime @default(now()) @map("created_at")
  /// Cuando se marca para borrado lógico. El borrado físico lo hace un job.
  deletedAt    DateTime? @map("deleted_at")

  @@index([uploadedById])
  @@index([purpose])
  @@index([deletedAt])
  @@map("stored_file")
}
```

Y la relación inversa en `User`:

```prisma
storedFiles  StoredFile[]
```

### Política de borrado

- `delete` del use case marca `deletedAt` en BBDD pero **no** borra en el backend de inmediato.
- Un job periódico (`PurgeDeletedFilesUseCase`, fuera del scope de esta spec inicial — issue aparte) recorre `stored_file` con `deletedAt < now() - 7d` y llama a `StoragePort.delete`, luego hace `DELETE` físico de la fila.
- Esto da margen para restaurar y desacopla la BBDD del backend cuando el bucket está caído.

## 6. Layout del módulo

Siguiendo §2.2 de la skill `core-architecture`:

```
apps/api/src/modules/storage/
├── domain/
│   ├── entities/
│   │   └── stored-file.entity.ts
│   └── errors/
│       ├── file-not-found.error.ts
│       └── storage-failure.error.ts
├── application/
│   ├── ports/
│   │   ├── storage.port.ts            # ver §3
│   │   └── stored-file-repository.port.ts
│   ├── dto/
│   │   ├── upload-file.dto.ts          # application-level, NO http
│   │   └── file-metadata.dto.ts
│   └── use-cases/
│       ├── upload-file.use-case.ts     # llama a StoragePort.put + repo.save
│       ├── download-file.use-case.ts   # busca por id en repo, devuelve stream
│       ├── get-file-url.use-case.ts    # signed url (get o put)
│       ├── delete-file.use-case.ts     # marca deletedAt
│       └── list-files.use-case.ts      # paginado / filtro por purpose / owner
├── infrastructure/
│   ├── adapters/
│   │   ├── local-disk.storage.adapter.ts
│   │   ├── s3.storage.adapter.ts
│   │   └── gcs.storage.adapter.ts      # placeholder, lanzar NotImplemented
│   ├── persistence/
│   │   ├── prisma-stored-file.repository.ts
│   │   └── stored-file.mapper.ts
│   ├── http/
│   │   ├── files.controller.ts
│   │   └── dto/
│   │       ├── upload-file-response.dto.ts
│   │       ├── file-metadata-response.dto.ts
│   │       └── signed-url-response.dto.ts
│   └── http-stream/
│       └── local-signed-url.controller.ts   # solo activo con driver=local
└── storage.module.ts
```

### Wiring en `storage.module.ts`

Patrón gemelo al de `MailerModule`:

```ts
{
  provide: STORAGE_PORT,
  useFactory: (config: ConfigService) => {
    const driver = config.getOrThrow<string>('STORAGE_DRIVER');
    switch (driver) {
      case 'local': return new LocalDiskStorageAdapter(config);
      case 's3':    return new S3StorageAdapter(config);
      case 'gcs':   return new GcsStorageAdapter(config);
      default: throw new Error(`STORAGE_DRIVER desconocido: ${driver}`);
    }
  },
  inject: [ConfigService],
},
{ provide: STORED_FILE_REPOSITORY, useClass: PrismaStoredFileRepository },
```

`exports`: `STORAGE_PORT`, `STORED_FILE_REPOSITORY`, y los use cases que otros módulos vayan a consumir (`UploadFileUseCase`, `GetFileUrlUseCase`…).

## 7. HTTP API

Controller `FilesController` montado en `/files`. Decorado con `@ApiTags('files')`.

| Método | Ruta | Descripción | Body / Query |
|---|---|---|---|
| `POST` | `/files` | Sube un fichero (`multipart/form-data`). Crea registro en `stored_file` + sube al backend. | `file: binary`, `purpose?: string` |
| `GET`  | `/files` | Lista ficheros del usuario actual (paginado, filtrable por `purpose`). | `page`, `pageSize`, `purpose?` |
| `GET`  | `/files/:id` | Devuelve la metadata. | — |
| `GET`  | `/files/:id/download` | Stream del binario (proxy hacia el backend). | — |
| `GET`  | `/files/:id/signed-url` | Devuelve una URL firmada para descarga directa (válida `?expiresInSec=…`). | `expiresInSec?` |
| `POST` | `/files/signed-upload-url` | Pide una URL firmada de subida (para clientes que prefieren upload directo al bucket). Crea `stored_file` con `checksum=""` hasta que el cliente confirma con `POST /files/:id/confirm`. | `originalName`, `contentType`, `size`, `purpose?` |
| `POST` | `/files/:id/confirm` | Marca como confirmado un fichero subido directo al bucket. Valida `exists()`. | — |
| `DELETE` | `/files/:id` | Borrado lógico. | — |

Adicional, solo cuando `STORAGE_DRIVER=local`:

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/files/raw` | Verifica el JWT del query `?token=…` y hace stream del fichero. Equivalente a una URL presignada de S3. NO se registra en el controller cuando driver ≠ local. |

### Autorización

- Por defecto, un usuario solo lee/borra sus propios ficheros (filtro por `uploadedById`).
- Para roles administrativos: integración con el modelo `ApiSection` ya existente — sección `files`, niveles `READ`/`WRITE`/`DELETE`/`ADMIN`. Un usuario con `ADMIN` en `files` ve y gestiona los de todos.

## 8. Variables de entorno

Añadir a [`.env.example`](../../.env.example) (y a `.env.local` los no-secretos):

```bash
# Storage — driver: local | s3 | gcs
STORAGE_DRIVER=local

# Driver=local
STORAGE_LOCAL_ROOT=./.storage      # opcional; default = <repo>/.storage

# Driver=s3
STORAGE_S3_BUCKET=
STORAGE_S3_REGION=eu-west-1
STORAGE_S3_ENDPOINT=               # opcional, para S3-compatible (MinIO/R2)
STORAGE_S3_FORCE_PATH_STYLE=false
STORAGE_S3_ACCESS_KEY_ID=          # opcional si se usa IAM role / profile
STORAGE_S3_SECRET_ACCESS_KEY=      # opcional si se usa IAM role / profile

# Driver=gcs (placeholder)
STORAGE_GCS_BUCKET=
STORAGE_GCS_PROJECT_ID=
STORAGE_GCS_KEY_FILE=
```

Validación: añadir un Zod/Joi schema en `src/shared/config/` que valide
condicionalmente según `STORAGE_DRIVER` (si es `s3`, `STORAGE_S3_BUCKET` es
obligatoria, etc.). Falla rápido en bootstrap, no en la primera subida.

## 9. `.gitignore` y `.dockerignore`

Añadir a [`.gitignore`](../../../../.gitignore) en la raíz:

```
# Storage local (driver=local)
.storage/
apps/api/.storage/
```

Y a [`.dockerignore`](../../../../.dockerignore) lo mismo, para que la imagen
no copie ficheros locales de un dev.

## 10. Dependencias nuevas

```bash
pnpm --filter @core/api add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm --filter @core/api add @nestjs/platform-express multer    # upload multipart
pnpm --filter @core/api add -D @types/multer
# Cuando se implemente GCS:
pnpm --filter @core/api add @google-cloud/storage
```

## 11. Plan de implementación

Iteración mínima, dejando GCS para después:

1. **Schema + migración.** Añadir `StoredFile` a `schema.prisma`, generar migración `add_stored_file`.
2. **Port + use cases.** `StoragePort`, `StoredFileRepositoryPort`, use cases `Upload` / `Download` / `Delete` / `List` / `GetUrl`.
3. **Adapter local.** `LocalDiskStorageAdapter` + endpoint `/files/raw` con JWT.
4. **HTTP controller.** `FilesController` con `POST /files` (multipart), `GET /files/:id`, `GET /files/:id/download`, `DELETE /files/:id`.
5. **Adapter S3.** `S3StorageAdapter` + ruta `signed-url` y `signed-upload-url` + `confirm`.
6. **Wiring + env validation.** `storage.module.ts`, importar en `AppModule`, schema de env condicional.
7. **Tests.**
   - Unit: use cases con port mockeado.
   - Integración: adapter local con tmpdir; adapter S3 contra MinIO en docker-compose (perfil `full`).
8. **(Fuera de scope inicial)** `PurgeDeletedFilesUseCase` + cron.
9. **(Fuera de scope inicial)** `GcsStorageAdapter`.

## 12. Decisiones abiertas

- **Antivirus.** ¿Pasamos ClamAV / S3 ObjectLambda? Pendiente decidir según riesgo (depende de qué ficheros se acepten).
- **Límites.** Tamaño máx por fichero / mime types permitidos: por defecto 25 MB y lista blanca configurable por `purpose`. Configurable en `STORAGE_MAX_BYTES` y un mapa por purpose en código.
- **Encriptación at-rest en local.** No por defecto; los ficheros locales son para dev. Si algún caso necesita PII real en local, encrypted file system del host.
- **Multi-tenant.** Por ahora `key` plano. Si en el futuro hay tenant, prefijo `tenants/{tenantId}/...` a nivel del use case.
