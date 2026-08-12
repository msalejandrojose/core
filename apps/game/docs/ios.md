# Llevar el juego a un iPhone

Godot no tiene un ecosistema de CLI como Capacitor. Lo que sí tiene es un
exportador por línea de comandos, así que el ciclo se parece bastante:

| Capacitor | Aquí |
|---|---|
| `npx cap add ios` | Crear el preset una vez (paso 2). Queda en `export_presets.cfg` y se commitea |
| `npx cap sync ios` | `./tools/ios.sh sync` |
| `npx cap open ios` | `./tools/ios.sh open` |

`./tools/ios.sh run` hace las dos últimas, que es el ciclo normal del día a día.

> **Pasos 1 y 2 ya hechos**: las export templates están instaladas y
> `export_presets.cfg` está en el repo. El export a proyecto Xcode se ha
> ejecutado y funciona. Lo que queda sin verificar es de Xcode en adelante
> (firma, instalación en dispositivo), porque requiere un Apple ID.

---

## Paso 0 — Compresión de texturas ETC2 ASTC

Ya está puesto en `project.godot`, pero conviene saber por qué está ahí:
exportar a arm64 (iOS, y macOS Apple Silicon) **exige**
`rendering/textures/vram_compression/import_etc2_astc=true`. Sin eso el export
falla.

La trampa: **el export de iOS falla con un mensaje de error vacío**. Literalmente
"configuration errors:" y nada detrás. Se encontró exportando a macOS, que sí
explica el problema con todas las letras. Si algún día ves un error vacío en un
export de iOS, prueba a exportar a macOS para leer el motivo real.

Activarlo obliga a reimportar todas las texturas la primera vez.

## Paso 1 — Export templates (una vez por versión del motor)

Son los runtimes precompilados de Godot para cada plataforma. Sin ellas no hay
export posible, y **no vienen con el editor**.

Desde el editor: **Editor → Gestionar plantillas de exportación → Descargar e
instalar**. Son ~1 GB y tardan un rato.

Se instalan en `~/Library/Application Support/Godot/export_templates/<versión>/`.
Al actualizar Godot hay que repetirlo: las templates van atadas a la versión
exacta del motor.

## Paso 2 — Crear el preset (una vez)

Es el equivalente a `cap add ios`, y es el único paso que no tiene CLI.

**Proyecto → Exportar → Añadir… → iOS**, y ahí:

| Campo | Valor | Por qué |
|---|---|---|
| Nombre del preset | `iOS` | El script lo busca por este nombre exacto |
| App Store Team ID | tu Team ID | Ver más abajo: es lo que evita tener que reconfigurar la firma en cada sync |
| Bundle Identifier | p. ej. `es.aj.racing` | Tiene que ser tuyo y único. No dejes el de ejemplo de Godot |
| Export Project Only | **activado** | Genera un proyecto Xcode en vez de intentar firmar un `.ipa`. La firma se hace en Xcode, que es donde vive tu Apple ID |

Guardar cierra el diálogo y escribe `export_presets.cfg` en la raíz del proyecto.
Ese fichero **sí se commitea**: es la configuración compartida.

## Paso 3 — Generar y abrir el proyecto Xcode

```bash
cd apps/game
./tools/ios.sh run
```

Regenera `build/ios/` y abre el `.xcodeproj`. `build/` está en `.gitignore`:
es artefacto, se genera.

Repite este paso **cada vez que cambies algo del juego**. Es el `cap sync`.

## Paso 4 — Firmar y ejecutar (en Xcode)

Esto es tuyo: implica meter tu Apple ID, y eso no lo hace nadie por ti.

1. En Xcode: **Signing & Capabilities** del target.
2. Marca **Automatically manage signing**.
3. En **Team**, añade tu Apple ID si no está (**Xcode → Settings → Accounts**).
   Una cuenta gratuita vale para instalar en tu propio dispositivo.
4. Conecta el iPhone por cable, desbloquéalo y acepta el diálogo de confianza.
5. Elige el dispositivo arriba y dale a ▶.
6. La primera vez el iPhone rechaza la app por desarrollador sin verificar:
   **Ajustes → General → VPN y gestión de dispositivos → confía en tu perfil.**

### El Team ID va en el preset, no solo en Xcode

`./tools/ios.sh sync` **regenera el proyecto Xcode entero**, incluido el
`project.pbxproj` donde vive la configuración de firma. Si pones tu equipo solo
desde la interfaz de Xcode, el siguiente sync se lo lleva por delante y hay que
volver a ponerlo.

La solución es poner el Team ID en `export_presets.cfg`
(`application/app_store_team_id`), que ahora mismo tiene el marcador
`TEAMIDTODO`. Así cada regeneración sale ya firmada con tu equipo.

Para averiguarlo, una vez tengas el Apple ID metido en Xcode:

```bash
security find-identity -v -p codesigning
```

Sale como `Apple Development: tu@email (XXXXXXXXXX)` — el código entre
paréntesis del final es el Team ID. También está en **Xcode → Settings →
Accounts**, columna Team.

### Sobre la cuenta gratuita

Funciona, con dos límites que conviene saber antes de pelearte con ellos:

- El perfil **caduca a los 7 días**. Pasado ese plazo la app deja de abrirse en
  el móvil y hay que volver a instalarla desde Xcode.
- No hay TestFlight ni instalación para otras personas.

Para eso hace falta el Apple Developer Program (99 $/año), que es lo que cubre
la parte de TestFlight de la tarea de distribución.

---

## Probar en el simulador

Alternativa sin cuenta ni cable: compilar para el simulador de iOS.

```bash
cd apps/game
./tools/ios.sh sync
xcodebuild -project build/ios/Racing.xcodeproj -scheme Racing \
  -sdk iphonesimulator -configuration Debug \
  -derivedDataPath build/ios/DerivedData build
xcrun simctl boot "iPhone 16 Pro"
xcrun simctl install booted build/ios/DerivedData/Build/Products/Debug-iphonesimulator/Racing.app
xcrun simctl launch booted es.aj.racing
```

**Limitación seria:** el simulador solo registra **un toque a la vez**. Girar y
acelerar simultáneamente —lo normal en este juego, y justo lo que hay que
juzgar— no se puede probar ahí. Sirve para ver que la app arranca y que el
pipeline de export funciona; no para valorar el tacto de los controles ni el
rendimiento real.

---

## Cosas que hay que mirar en el dispositivo y aquí no se pueden

Quedaron anotadas mientras se construía la app:

- **Área segura.** `race_hud.gd` desplaza el HUD con
  `DisplayServer.get_display_safe_area()`, pero en escritorio esa llamada
  devuelve la ventana entera, así que el código nunca se ha ejercitado de
  verdad. En horizontal el notch se come un lateral: comprobar que ni el
  cronómetro ni los botones quedan debajo.
- **Rendimiento.** El starter kit viene con sombras suaves en calidad alta y
  SSAO en calidad 3 (`project.godot`, sección `[rendering]`). Son ajustes de
  escritorio. Medir fps reales antes de tocar nada, y bajar de ahí.
- **Tacto de los controles.** Es el riesgo principal de la Fase 0 y solo se
  puede juzgar con el móvil en la mano.
