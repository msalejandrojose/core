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

| Propiedad    | Tipo           | Valores posibles |
|--------------|----------------|------------------|
| `Tarea`      | TITLE          | Texto libre (nombre de la tarea) |
| `Estado`     | SELECT         | Ver estados más abajo |
| `Prioridad`  | SELECT         | `🔴 Alta`, `🟡 Media`, `🟢 Baja` |
| `Fecha límite` | DATE         | ISO-8601 (`YYYY-MM-DD`) |
| `Responsable`| PEOPLE         | Array de user IDs |
| `Categoría`  | MULTI_SELECT   | `Desarrollo`, `Diseño`, `Marketing`, `Operaciones`, `Otro` |
| `Descripción`| RICH_TEXT      | Texto libre |
| `ID`         | UNIQUE_ID      | Auto-generado (prefijo `TASK`) |

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

Estas son las herramientas disponibles del MCP de Notion:

- **`notion-create-pages`** — crear tareas nuevas
- **`notion-search`** — buscar tareas por nombre o contenido
- **`notion-fetch`** — ver el contenido o propiedades de una tarea específica
- **`notion-update-page`** — actualizar propiedades de una tarea (estado, prioridad, etc.)

## Cómo crear una tarea nueva

Usa `notion-create-pages` con el parent `data_source_id`:

```json
{
  "parent": { "type": "data_source_id", "data_source_id": "594ed815-9138-4416-8f95-5c2cb692b201" },
  "pages": [{
    "properties": {
      "Tarea": "Nombre de la tarea",
      "Estado": "TODO",
      "Prioridad": "🔴 Alta",
      "Categoría": "[\"Desarrollo\"]",
      "Descripción": "Descripción opcional"
    }
  }]
}
```

Si el usuario no especifica el estado, usa `"TODO"` por defecto.
Si no especifica prioridad, usa `"🟡 Media"`.

## Cómo buscar o filtrar tareas

**Importante:** `notion-search` es búsqueda semántica — NO filtra por valor de propiedad. Si el
usuario pregunta "qué tareas tengo en estado X", NO uses el nombre del estado como query porque
devolverá resultados vacíos o irrelevantes.

### Para listar tareas por estado

1. Busca todas las tareas con un query amplio (nombre del proyecto, o algo genérico):
```json
{
  "query": "Core",
  "data_source_url": "collection://594ed815-9138-4416-8f95-5c2cb692b201",
  "page_size": 25
}
```

2. Haz `notion-fetch` en cada resultado para leer sus propiedades reales.

3. Filtra manualmente por el campo `Estado` y presenta solo los que coincidan.

Si los resultados de búsqueda no incluyen todas las tareas, también puedes hacer `notion-fetch`
directamente sobre la URL de la base de datos para obtener la lista completa:
```
https://app.notion.com/p/cbac4883b3384a2da9072ee82c0015d1
```

### Para buscar una tarea específica por nombre

Usa el nombre de la tarea como query (o una parte de él) y el `data_source_url`:
```json
{
  "query": "CRUD",
  "data_source_url": "collection://594ed815-9138-4416-8f95-5c2cb692b201"
}
```

Si no aparece con `data_source_url`, prueba sin él (búsqueda global en el workspace):
```json
{
  "query": "CRUD"
}
```

## Cómo actualizar una tarea

Primero busca la tarea con `notion-search` para obtener su `page_id`, luego usa `notion-update-page`:

```json
{
  "page_id": "<id de la página>",
  "command": "update_properties",
  "properties": {
    "Estado": "Hecha"
  }
}
```

Puedes actualizar cualquier propiedad. Para fechas usa el formato expandido:
`"date:Fecha límite:start": "2026-06-20"`.

## Respuesta al usuario

Después de crear o actualizar una tarea, confirma brevemente lo que se hizo e incluye el enlace
directo a la tarea si está disponible. Para consultas (ver tareas), muestra los resultados en una
tabla o lista clara con al menos: nombre, estado y prioridad.
