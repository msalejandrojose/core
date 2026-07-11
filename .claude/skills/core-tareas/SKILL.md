---
name: core-tareas
description: >
  Gestión completa de tareas del proyecto Core en Notion. Úsala siempre que el usuario quiera
  crear, ver, filtrar, actualizar o cambiar el estado de tareas en la base de datos "Tareas — Core".
  Aplica cuando mencione estados como "pendiente de revisar", "TODO", "en progreso", "hecha" o
  "confirmada"; cuando pregunte qué hay por hacer, qué está en curso, qué falta confirmar; o cuando
  quiera añadir una tarea nueva al proyecto Core. También aplica si el usuario dice cosas como
  "ponme esa tarea como hecha", "qué tengo pendiente", "crea una tarea para X", o cualquier variante
  de gestión de tareas para este proyecto.
---

# Skill: Gestión de Tareas — Core

Tienes acceso a la base de datos de tareas del proyecto Core en Notion. Aquí está todo lo que
necesitas para trabajar con ella.

## Base de datos

- **Nombre**: 🗂️ Tareas — Core
- **URL**: https://app.notion.com/p/cbac4883b3384a2da9072ee82c0015d1
- **Data source ID**: `collection://594ed815-9138-4416-8f95-5c2cb692b201`

Usa siempre el `data_source_id` (no el `database_id`) al crear páginas, ya que es una base de datos
con una sola fuente de datos.

## Propiedades disponibles

| Propiedad      | Tipo           | Valores posibles |
|----------------|----------------|------------------|
| `Tarea`        | TITLE          | Texto libre (nombre de la tarea) |
| `Estado`       | SELECT         | Ver estados más abajo |
| `Prioridad`    | SELECT         | `🔴 Alta`, `🟡 Media`, `🟢 Baja` |
| `Fecha límite` | DATE           | ISO-8601 (`YYYY-MM-DD`) |
| `Responsable`  | PEOPLE         | Array de user IDs |
| `Categoría`    | MULTI_SELECT   | `Desarrollo`, `Diseño`, `Marketing`, `Operaciones`, `Otro` |
| `Descripción`  | RICH_TEXT      | Texto libre |
| `ID`           | UNIQUE_ID      | Auto-generado (prefijo `TASK`) |
| `Proyecto`     | SELECT         | `core` + cualquier proyecto cliente (peluquerias, coches…) |
| `Entorno`      | SELECT         | `dev`, `pre`, `prod` |
| `Rama`         | RICH_TEXT      | Nombre de la rama git asociada (auto-rellenado) |

## Estados de las tareas

El flujo típico de una tarea es de izquierda a derecha, pero se puede mover en cualquier dirección:

```
Pendiente de revisar → TODO → En progreso → Hecha → Confirmada
```

| Estado               | Color   | Significado |
|----------------------|---------|-------------|
| `Pendiente de revisar` | ⬜ Gris | La tarea existe pero aún no está lista para empezar. Necesita revisión o aclaración. |
| `TODO`               | 🔵 Azul | Aprobada y lista para que alguien la tome. |
| `En progreso`        | 🟡 Amarillo | Alguien está trabajando activamente en ella. |
| `Hecha`              | 🟢 Verde | El trabajo está terminado, pendiente de validación. |
| `Confirmada`         | 🟣 Morado | Revisada y aceptada definitivamente. Completada. |

## Herramientas de Notion a usar

- **`notion-create-pages`** — crear tareas nuevas
- **`notion-search`** — buscar tareas por nombre o contenido
- **`notion-fetch`** — ver el contenido o propiedades de una tarea específica
- **`notion-update-page`** — actualizar propiedades de una tarea (estado, prioridad, rama, etc.)
- **`notion-update-data-source`** — añadir nuevas opciones a selects (p.ej. nuevo proyecto)

## Reglas de clarificación al crear tareas

**SIEMPRE pregunta antes de crear si no está claro alguno de estos puntos:**

### 1. ¿Es para Core o para un proyecto cliente?
Si el usuario no menciona explícitamente a qué proyecto pertenece la tarea, pregunta:
> "¿Esta tarea es para el Core en general o para un proyecto específico (peluquerías, coches…)?"

- Si es para **Core**: `Proyecto: core`, sin `Entorno`, sin `Rama` de proyecto.
- Si es para un **proyecto cliente**: continúa con la pregunta de entorno.

### 2. ¿Para qué entorno?
Si la tarea es de un proyecto cliente pero no se especifica entorno, pregunta:
> "¿Para qué entorno es? (dev / pre / prod)"

### 3. ¿Cuándo está claro sin preguntar?
Puedes asumir sin preguntar si:
- El usuario dice explícitamente el proyecto y/o entorno ("para peluquerias-dev", "en el proyecto coches en pre").
- El contexto de la conversación deja claro el proyecto activo.
- La tarea es claramente de infraestructura o tooling del Core (no de un cliente).

---

## Convención de ramas por proyecto

### Ramas base de proyecto
```
{proyecto}-{entorno}
```
Ejemplos: `peluquerias-dev`, `peluquerias-pre`, `coches-dev`

Estas ramas parten de `main` y contienen el proyecto completo para ese entorno.

### Ramas de tarea (feature branches)
```
{proyecto}-{entorno}--{task-id}-{slug}
```
- `{task-id}`: el ID auto-generado de Notion (p.ej. `TASK-12`)
- `{slug}`: nombre de la tarea en kebab-case, max ~4 palabras

Ejemplos:
- `peluquerias-dev--TASK-12-formulario-cita`
- `coches-dev--TASK-23-ficha-vehiculo`

Las ramas de tarea **parten de la rama base del proyecto** y se mergean de vuelta a ella.

⚠️ **Doble guión, nunca barra.** `{proyecto}-{entorno}/{task-id}-{slug}` (con `/`) es inválido en git: no pueden coexistir una rama `peluquerias-dev` y una rama `peluquerias-dev/TASK-12-...`, porque las refs de git son jerárquicas por rutas (una no puede ser a la vez hoja y directorio). Se descubrió al crear la primera rama de tarea real (`andanzas-dev`, TASK-162) — ver `core-architecture` §10.

---

## Flujo completo: de tarea a rama

Cuando el usuario quiere empezar a trabajar en una tarea de proyecto:

1. **Busca la tarea** en Notion para obtener su `ID` y nombre.
2. **Genera el slug** del nombre en kebab-case (máx. 4 palabras).
3. **Crea la rama** localmente desde la rama base del proyecto:
   ```bash
   git checkout peluquerias-dev
   git pull origin peluquerias-dev
   git checkout -b peluquerias-dev--TASK-12-formulario-cita
   ```
4. **Actualiza la tarea en Notion**:
   - `Estado`: `En progreso`
   - `Rama`: `peluquerias-dev--TASK-12-formulario-cita`
5. **Confirma** al usuario con el nombre de la rama y el enlace a la tarea.

Cuando el trabajo termina y hay que mergear:
```bash
git checkout peluquerias-dev
git merge peluquerias-dev--TASK-12-formulario-cita
git push origin peluquerias-dev
```
Luego actualiza la tarea a `Hecha`.

---

## Cómo crear una tarea nueva

Usa `notion-create-pages` con el parent `data_source_id`:

```json
{
  "parent": { "type": "data_source_id", "data_source_id": "594ed815-9138-4416-8f95-5c2cb692b201" },
  "pages": [{
    "properties": {
      "Tarea": "Nombre de la tarea",
      "Estado": "TODO",
      "Prioridad": "🟡 Media",
      "Categoría": "[\"Desarrollo\"]",
      "Proyecto": "peluquerias",
      "Entorno": "dev",
      "Descripción": "Descripción opcional"
    }
  }]
}
```

Defaults si el usuario no especifica:
- `Estado` → `TODO`
- `Prioridad` → `🟡 Media`
- `Proyecto` → `core` (solo si está claro que es Core)
- `Entorno` → no rellenar si el proyecto es `core`

**Si se añade un proyecto nuevo** (que no existe aún en el SELECT de Notion), primero añade la
opción con `notion-update-data-source`:
```json
{
  "data_source_id": "594ed815-9138-4416-8f95-5c2cb692b201",
  "statements": "ALTER COLUMN \"Proyecto\" SET SELECT('core':gray, 'peluquerias':purple, 'coches':blue)"
}
```
Luego crea la tarea normalmente.

---

## Cómo buscar o filtrar tareas

**Importante:** `notion-search` es búsqueda semántica — NO filtra por valor de propiedad. Si el
usuario pregunta "qué tareas tengo en estado X", NO uses el nombre del estado como query.

### Para listar tareas por estado

1. Busca con un query amplio:
```json
{
  "query": "Core",
  "data_source_url": "collection://594ed815-9138-4416-8f95-5c2cb692b201",
  "page_size": 25
}
```
2. Haz `notion-fetch` en cada resultado para leer sus propiedades reales.
3. Filtra manualmente por `Estado` y presenta solo los que coincidan.

Si los resultados no son suficientes, haz `notion-fetch` sobre la URL de la base de datos:
```
https://app.notion.com/p/cbac4883b3384a2da9072ee82c0015d1
```

### Para buscar por proyecto o entorno

Busca con el nombre del proyecto como query:
```json
{
  "query": "peluquerias",
  "data_source_url": "collection://594ed815-9138-4416-8f95-5c2cb692b201",
  "page_size": 25
}
```
Luego filtra manualmente por `Proyecto` y/o `Entorno` en los resultados.

### Para buscar una tarea específica por nombre

```json
{
  "query": "formulario cita",
  "data_source_url": "collection://594ed815-9138-4416-8f95-5c2cb692b201"
}
```

---

## Cómo actualizar una tarea

Primero busca la tarea con `notion-search` para obtener su `page_id`, luego usa `notion-update-page`:

```json
{
  "page_id": "<id de la página>",
  "command": "update_properties",
  "properties": {
    "Estado": "En progreso",
    "Rama": "peluquerias-dev--TASK-12-formulario-cita"
  }
}
```

Para fechas usa el formato expandido: `"date:Fecha límite:start": "2026-06-20"`.

---

## Respuesta al usuario

Después de crear o actualizar una tarea, confirma brevemente lo que se hizo e incluye el enlace
directo a la tarea si está disponible. Para consultas (ver tareas), muestra los resultados en una
tabla o lista clara con al menos: nombre, estado, proyecto y prioridad.
