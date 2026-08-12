# Racing (nombre provisional) — SPEC

Juego de carreras contrarreloj para iOS/Android, construido sobre el
[Starter Kit Racing de Kenney](https://github.com/KenneyNL/Starter-Kit-Racing) (Godot).

Este documento define **solo la Fase 0**. Las fases posteriores están enumeradas
al final como fuera de alcance, con el motivo por el que se posponen.

Rama base del proyecto: `racing-dev` (convención §10 de la skill `core-architecture`).

---

## 1. Origen y licencia

| Pieza | Licencia | Obligación |
|---|---|---|
| Código del starter kit | MIT © Kenney | Mantener el aviso de copyright + texto MIT en el producto distribuido |
| Assets (sprites 2D, modelos 3D, SFX) | CC0 | Ninguna. Ni atribución. |

**Acción concreta:** pantalla de "Licencias" accesible desde Ajustes, con el texto
MIT íntegro y el copyright de Kenney. Se implementa en Fase 0, no después — es
barato ahora y es un requisito de review de las stores si se audita.

**No reutilizar:** el nombre "Starter Kit Racing", el icono ni el splash de Kenney.
La licencia MIT cubre el código, no la marca. Rebrand desde el día 1 (aunque sea
provisional).

---

## 2. Decisiones tomadas

| Decisión | Elección | Motivo |
|---|---|---|
| Ubicación | Todo dentro del monorepo `core` | Reaprovechar IAM, Prisma, Docker, backoffice |
| Proyecto Godot | `apps/game/` | Paquete del workspace (`@core/game`). El `package.json` no tiene dependencias: existe solo para que el proyecto tenga los mismos comandos `pnpm` que el resto de apps |
| Backend | `apps/api` → `src/modules/racing/` | Módulo de dominio en la rama `racing-dev`, nunca en `main` |
| Auth | IAM existente de `core` (`modules/iam`) | Email/password + social login ya construidos y probados |
| Multijugador | Ninguno en F0 | Ver §7 |
| Ghosts | **Fuera de F0** | Decisión explícita del usuario: primero validar el loop desnudo |

### Por qué `apps/mobile` no sirve aquí

`apps/mobile` es Ionic + React + Capacitor: renderiza HTML. El juego lo renderiza
Godot y se exporta a binario nativo por su propio pipeline. Son dos apps distintas
que casualmente apuntan a los mismos endpoints. `apps/mobile` sigue siendo la app
companion si algún día hace falta (perfil, tienda, social fuera de la carrera);
en F0 no se toca.

---

## 3. Alcance de la Fase 0

### Dentro

1. **Juego** — Starter kit adaptado: 4 circuitos, 1 coche, modo contrarreloj.
   - Cronómetro con precisión de milisegundos.
   - Detección de vuelta válida por checkpoints en orden (evita atajos).
   - Salida con semáforo, para que todas las vueltas empiecen igual.
   - Reinicio rápido (el gesto más usado de un contrarreloj — debe ser instantáneo).
   - Controles táctiles: acelerador/freno + dirección. **Reescritos**: el starter
     kit usa teclado. Dos esquemas elegibles: volante flotante analógico y toque
     lateral con acelerador automático.
   - Ajustes con circuito y sentido (normal / inverso). Cada combinación de
     circuito y sentido es un circuito distinto a efectos de tiempos.
   - Los circuitos se construyen en tiempo de ejecución desde una lista de
     celdas (`scripts/track/track_catalog.gd`): añadir uno es añadir
     coordenadas, no montar una escena.
   - Cada circuito lleva su ambientación y su agarre. El nevado repinta la
     paleta compartida de los modelos (verde → blanco) y baja el agarre, así
     que el coche gira tarde y frena largo.
2. **Cuenta** — login vía IAM de `core` (email/password + Google/Apple).
   Usuarios de tipo `APP`.
3. **Leaderboard global** — subir tiempo al terminar vuelta, ver top N + tu posición.
4. **Licencias** — pantalla con MIT + copyright de Kenney.
5. **Distribución** — build instalable en TestFlight (iOS) e Internal Testing
   (Google Play), desde un pipeline repetible y documentado.

### Fuera (explícito)

Ghosts, amigos, temporadas, IAP, skills/skins, editor de circuitos en la app,
backoffice, múltiples coches, sonido propio, live racing.

### Criterio de "hecho"

> Una persona ajena al proyecto se instala la app desde TestFlight en su iPhone,
> se registra, corre tres vueltas, mejora su tiempo, y ve su nombre en un
> leaderboard con los tiempos de otros. Sin que nadie le explique nada.

Si eso funciona y le apetece correr una cuarta vuelta, el loop engancha y se
justifica la Fase 1. Si no engancha, ninguna cantidad de IAP lo arregla.

---

## 4. Modelo de datos (Prisma, F0)

Mínimo viable. Se añade a `apps/api/prisma/schema.prisma` en la rama `racing-dev`.

```prisma
/// Circuito jugable. En F0 hay uno, sembrado por seed — pero corriéndose en
/// los dos sentidos, y cada sentido es una fila distinta.
///
/// Por qué una fila y no un flag en LapTime: una vuelta al revés no es
/// comparable con una normal, así que son leaderboards separados. Modelarlo
/// como `Track` hace que esa separación sea estructural en vez de depender de
/// que cada consulta se acuerde de filtrar por sentido.
model Track {
  id        String   @id @default(uuid()) @db.Char(36)
  slug      String   @unique @db.VarChar(64)   // "kenney-01", "kenney-01-rev"
  name      String   @db.VarChar(120)
  /// Nº de SECTORES de la vuelta = checkpoints intermedios + la meta. Es
  /// también la longitud que debe tener `splitsMs`. En el cliente el
  /// equivalente es `LapTimer.sector_count()`.
  checkpointCount Int @map("checkpoint_count")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  lapTimes  LapTime[]

  @@map("racing_track")
}

/// Un intento de vuelta subido por un usuario. Se guardan TODOS los intentos
/// (no solo el mejor): el histórico es la materia prima de los KPIs de la
/// Fase 3 y del anti-cheat.
model LapTime {
  id        String   @id @default(uuid()) @db.Char(36)
  userId    String   @map("user_id") @db.Char(36)
  trackId   String   @map("track_id") @db.Char(36)
  /// Tiempo total en milisegundos. Entero: nunca floats para tiempos.
  durationMs Int     @map("duration_ms")
  /// Split acumulado por checkpoint, en ms. JSON porque el nº varía por pista.
  splitsMs  Json     @map("splits_ms")
  /// Versión del build del cliente que lo generó. Imprescindible para poder
  /// invalidar tiempos cuando cambie la física.
  clientVersion String @map("client_version") @db.VarChar(32)
  createdAt DateTime @default(now()) @map("created_at")

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  track Track @relation(fields: [trackId], references: [id], onDelete: Cascade)

  /// El leaderboard consulta por pista ordenando por tiempo.
  @@index([trackId, durationMs])
  @@index([userId, trackId, durationMs])
  @@map("racing_lap_time")
}
```

Nota sobre `clientVersion`: cualquier cambio en la física del coche invalida la
comparabilidad de todos los tiempos anteriores. Sin este campo, el primer ajuste
de manejo te obliga a borrar el leaderboard entero o a vivir con datos mentirosos.

---

## 5. API (F0)

Módulo `apps/api/src/modules/racing/`, siguiendo §2.2 de `core-architecture`.

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/v1/racing/tracks` | Lista de pistas activas (cursor, §9) |
| `POST` | `/v1/racing/tracks/:trackId/lap-times` | Sube un intento. Devuelve si es récord personal y la posición resultante |
| `GET` | `/v1/racing/tracks/:trackId/leaderboard` | Top N (mejor tiempo por usuario) + la fila del usuario autenticado |
| `GET` | `/v1/racing/me/best/:trackId` | Mejor tiempo propio |

Casos de uso: `SubmitLapTimeUseCase`, `GetLeaderboardUseCase`, `ListTracksUseCase`,
`GetPersonalBestUseCase`.

### Anti-cheat mínimo

El cliente es autoritativo sobre el tiempo — es inevitable en un juego offline-first,
y no vale la pena resolverlo de verdad en F0. Pero hay tres validaciones baratas que
evitan el 95% del abuso trivial y que **deben estar desde el principio**, porque
retrofit sobre un leaderboard ya contaminado no tiene arreglo:

1. `durationMs` dentro de un rango plausible por pista (`minPlausibleMs` sembrado
   junto a la pista). Por debajo → rechazo.
2. `splitsMs` monótono creciente, con tantos elementos como `checkpointCount`, y
   `splitsMs[last] === durationMs`.
3. Rate limit por usuario: un intento no puede llegar antes de `durationMs` desde
   el anterior.

Lo que **no** se hace en F0: replay server-side, firma del payload, detección
estadística de outliers. Se apunta como deuda consciente.

---

## 6. Cliente Godot (`apps/game/`)

```
apps/game/
├── project.godot
├── scenes/          # pista, coche, HUD, menús
├── scripts/
│   ├── car/         # controlador (reescrito para táctil)
│   ├── timing/      # cronómetro + validación de checkpoints
│   └── net/         # cliente HTTP contra la API + almacenamiento de sesión
├── assets/          # CC0 de Kenney + lo propio
├── export_presets.cfg
├── LICENSES.md      # MIT de Kenney, mostrado en la pantalla de Licencias
└── docs/
```

Puntos que van a costar más de lo que parecen:

- **Controles táctiles.** El starter kit es `Input.is_action_pressed` con teclado.
  El feeling táctil en un juego de coches es lo que decide si el juego se siente
  bien o barato; presupuesta iteración real aquí, no un port mecánico.
- **Sesión y offline.** El teléfono pierde red a mitad de vuelta. Los intentos se
  encolan localmente y se suben cuando hay conexión; el cronómetro nunca depende
  del servidor.
- **Rendimiento.** Un starter kit de escritorio puede ir a 15 fps en un Android de
  gama media. Medir en dispositivo real antes de añadir nada visual.

---

## 7. Por qué no hay ghosts ni multijugador en F0

Decisión del usuario, y es la correcta: el ghost es el gancho del producto, pero
**no valida nada que el contrarreloj solo no valide ya**. Si correr la misma pista
tres veces seguidas no apetece sin fantasmas, tampoco apetecerá con ellos.

Además, el formato de grabación del ghost es una decisión que conviene tomar
*después* de tener la física final: snapshots a ~20 Hz e interpolación (robusto,
~30 KB/vuelta) vs. grabar inputs y re-simular (diminuto, pero exige determinismo
que Godot no garantiza entre dispositivos). Decidirlo antes de congelar la física
es decidirlo a ciegas.

**Lo único que F0 debe hacer por el ghost futuro:** guardar `splitsMs`. Con los
splits ya puedes mostrar "vas 0,4 s por delante de tu récord" en el HUD, que es
el 80% de la sensación del ghost por el 5% del trabajo.

---

## 8. Fases posteriores (fuera de alcance, aquí solo para no perderlas)

| Fase | Contenido | Por qué después |
|---|---|---|
| 1 | Ghosts (propio y de amigos), amigos por código, comparativa diaria | Necesita física congelada y el loop validado |
| 2 | Temporadas con reset de leaderboard, skins como primer IAP | La retención se monetiza; sin retención no hay nada que monetizar |
| 3 | Skills/mejoras de coche | Toca balance: cambia la física → invalida tiempos. Requiere versionado de leaderboard |
| 4 | Editor de circuitos (premium) | Es un producto en sí mismo. GridMap desde móvil es un proyecto de meses |
| 5 | Backoffice: circuitos, usuarios, KPIs | `apps/backoffice` ya existe; es el trozo más barato y el que menos urge |

---

## 9. Riesgos abiertos

- **Físicas y balance vs. leaderboard.** Cada retoque de manejo invalida tiempos.
  Mitigado parcialmente por `clientVersion`, pero hay que decidir política:
  ¿leaderboards separados por versión, o reset?
- **Cheating.** En cuanto haya IAP y competición, alguien lo intentará. La deuda
  de §5 hay que pagarla antes de la Fase 2.
- **"Otro juego de coches".** El starter kit es genérico por diseño. La
  diferenciación tiene que venir del ángulo social (F1), no del gameplay base.
- **Coste de stores.** 99 $/año Apple + 25 $ Google, y review de Apple para un
  juego con IAP no es trivial. Presupuestarlo antes de F2.
