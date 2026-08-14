extends Node

## Prueba de humo de `TerrainCatalog` (TASK-304): sin red cae a los valores
## por defecto de `TrackTerrain` sin romper nada, y cuando hay overrides
## tienen que ganar sobre el valor por defecto. No hay servidor real en este
## entorno, así que los overrides se ponen a mano en vez de venir de una
## respuesta HTTP — lo que se prueba es la lógica de "cuál gana", no el
## transporte (eso ya lo prueba `api_client_test.gd` cuando hay servidor).
##
##     godot --headless --quit-after 60 res://tests/terrain_catalog_test.tscn

const KINDS := [
	TrackTerrain.Kind.ASPHALT,
	TrackTerrain.Kind.ICE,
	TrackTerrain.Kind.MUD,
	TrackTerrain.Kind.WATER,
]

var _failures := 0


func _ready() -> void:
	# Da tiempo a que el intento de refresco automático del autoload (sin
	# servidor, falla rápido) termine antes de comprobar el estado.
	await get_tree().process_frame
	await get_tree().process_frame

	_test_sin_red_cae_a_los_valores_por_defecto()
	_test_override_gana_al_valor_por_defecto()

	TerrainCatalog._overrides = {}

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_sin_red_cae_a_los_valores_por_defecto() -> void:
	TerrainCatalog._overrides = {}

	for kind in KINDS:
		var got := TerrainCatalog.effect(kind)
		var want := TrackTerrain.effect(kind)
		_check(got.grip, want.grip, "sin overrides, el tipo %d usa el grip por defecto" % kind)
		_check(got.slows_top_speed, want.slows_top_speed,
			"sin overrides, el tipo %d usa slows_top_speed por defecto" % kind)


func _test_override_gana_al_valor_por_defecto() -> void:
	TerrainCatalog._overrides = {
		TrackTerrain.Kind.ICE: TrackTerrain.Effect.new(0.1, true),
	}

	var ice := TerrainCatalog.effect(TrackTerrain.Kind.ICE)
	_check(ice.grip, 0.1, "un override cambia el grip efectivo")
	_check(ice.slows_top_speed, true, "y también slows_top_speed")

	var mud := TerrainCatalog.effect(TrackTerrain.Kind.MUD)
	_check(mud.grip, TrackTerrain.effect(TrackTerrain.Kind.MUD).grip,
		"un tipo sin override no se ve afectado")


# --- Utilidades ---------------------------------------------------------------

func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
