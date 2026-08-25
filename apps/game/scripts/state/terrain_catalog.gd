extends Node

## Factores de terreno de sección (hielo/barro/agua), traídos de la API para
## poder ajustarlos desde el backoffice sin desplegar el juego (TASK-304) —
## antes vivían fijos en `TrackTerrain.gd`.
##
## Autoload registrado como `TerrainCatalog` en project.godot.
##
## Sin red (o antes de que la respuesta llegue), se usan los valores por
## defecto de `TrackTerrain`: el terreno tiene que funcionar igual que hoy
## aunque la API no conteste — es dato de equilibrado, no algo que bloquee
## jugar.

signal changed()

var _overrides: Dictionary = {}


func _ready() -> void:
	refresh()


func refresh() -> void:
	var response = await RacingApi.terrain_effects()
	if not response.ok or not (response.data is Dictionary):
		push_warning("No se pudieron cargar los factores de terreno, se mantienen los por defecto.")
		return

	var items: Variant = response.data.get("items")
	if not (items is Array):
		return

	var overrides := {}
	for item in items:
		if not (item is Dictionary):
			continue
		var kind: int = TrackTerrain.kind_from_code(str(item.get("type", "")))
		if kind == -1:
			continue
		overrides[kind] = TrackTerrain.Effect.new(
			float(item.get("grip", 1.0)), bool(item.get("slowsTopSpeed", false)))

	_overrides = overrides
	changed.emit()


## Mismo interfaz que `TrackTerrain.effect()`: quien llama no necesita saber
## si el valor vino de la red o es el por defecto.
func effect(kind: TrackTerrain.Kind) -> TrackTerrain.Effect:
	return _overrides.get(kind, TrackTerrain.effect(kind))
