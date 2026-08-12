extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del catálogo de circuitos y del constructor:
##
##     godot --quit-after 1800 res://tests/track_catalog_test.tscn
##
## Un trazado mal escrito no se ve al arrancar: el circuito sale con un hueco o
## una pieza girada y solo lo descubres conduciendo. Estas reglas son las que
## hacen que añadir un circuito sea seguro.

var _failures := 0


func _ready() -> void:
	TestEnv.reset()

	_check(TrackCatalog.all().size() >= 3, true, "hay al menos tres circuitos")
	_check_eq(TrackCatalog.ids().size(), _unique(TrackCatalog.ids()).size(), "los ids no se repiten")

	for layout in TrackCatalog.all():
		_validate_layout(layout)

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var director: RaceDirector = main.get_node("RaceDirector")
	var builder: TrackBuilder = main.get_node("TrackBuilder")
	var timer: LapTimer = main.get_node("LapTimer")
	director.set_process(false)

	for layout in TrackCatalog.all():
		await _validate_build(builder, timer, layout)

	# Un id desconocido no puede dejar el juego sin pista.
	_check_eq(TrackCatalog.by_id("no-existe").id, TrackCatalog.DEFAULT_ID, "un id desconocido cae al primero")

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Reglas del trazado -------------------------------------------------------

func _validate_layout(layout) -> void:
	var path: Array = layout.path
	var id: String = layout.id

	_check(path.size() >= 8, true, "%s: el trazado tiene largo suficiente" % id)
	_check_eq(_unique(path).size(), path.size(), "%s: no repite ninguna celda" % id)

	var orthogonal := true
	for i in path.size():
		var step: Vector2i = path[(i + 1) % path.size()] - path[i]
		if absi(step.x) + absi(step.y) != 1:
			orthogonal = false
	_check(orthogonal, true, "%s: cierra el bucle en pasos de una celda" % id)

	# La meta tiene que caer en recta: en una curva la salida quedaría
	# atravesada respecto al asfalto.
	var last: Vector2i = path[path.size() - 1]
	var into: Vector2i = path[0] - last
	var out: Vector2i = path[1] - path[0]
	_check_eq(into, out, "%s: la meta cae en recta" % id)


# --- Construcción -------------------------------------------------------------

func _validate_build(builder: TrackBuilder, timer: LapTimer, layout) -> void:
	var placed: int = builder.build(layout)
	timer.rescan()
	await get_tree().physics_frame

	var id: String = layout.id

	_check_eq(placed, layout.checkpoints, "%s: coloca los checkpoints pedidos" % id)
	_check_eq(timer.checkpoint_count, layout.checkpoints, "%s: el crono los encuentra" % id)

	var gates := get_tree().get_nodes_in_group("checkpoint")
	_check_eq(gates.size(), layout.checkpoints + 1, "%s: checkpoints más la meta" % id)

	# Cada celda del trazado tiene pieza, y ninguna es de decoración.
	var missing := 0
	for cell in layout.path:
		var item: int = builder.grid_map.get_cell_item(Vector3i(cell.x, 0, cell.y))
		if item != TrackBuilder.ITEM_STRAIGHT and item != TrackBuilder.ITEM_CORNER and item != TrackBuilder.ITEM_FINISH:
			missing += 1
	_check_eq(missing, 0, "%s: todas las celdas tienen pieza de asfalto" % id)

	# La salida es la línea de meta, no un punto suelto de la escena.
	var finish_center: Vector3 = builder.cell_center(layout.path[0])
	_check(builder.start_position.distance_to(finish_center) < 0.01, true, "%s: se sale desde la meta" % id)

	# Y mirando hacia donde sigue el circuito.
	var forward: Vector2i = layout.path[1] - layout.path[0]
	var facing := Vector2(sin(builder.start_yaw), cos(builder.start_yaw))
	_check(facing.distance_to(Vector2(forward.x, forward.y)) < 0.01, true, "%s: mira hacia el primer tramo" % id)


# --- Utilidades ---------------------------------------------------------------

func _unique(items: Array) -> Array:
	var seen := {}
	for item in items:
		seen[item] = true
	return seen.keys()


func _check(got: bool, want: bool, label: String) -> void:
	_report(got == want, label, want, got)


func _check_eq(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
