extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de que el terreno de sección (TASK-271) se lee EN VIVO bajo el
## coche, sin reconstruir el circuito, y de que la transición se interpola en
## vez de saltar (TASK-273):
##
##     godot --headless --quit-after 800 res://tests/track_terrain_test.tscn
##
## `chicane` tiene barro pintado en dos celdas de la ese, sobre un circuito
## normal de asfalto; `nevado` tiene hielo en la entrada de la horquilla
## final, encima del tema de nieve. Ver `TrackCatalog`.

const SETTLE_FRAMES := 90

var _failures := 0
var _director: RaceDirector
var _vehicle: Vehicle
var _sphere: RigidBody3D
var _builder: TrackBuilder


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	_director = main.get_node("RaceDirector")
	_vehicle = main.get_node("Vehicle")
	_sphere = _vehicle.get_node("Sphere")
	_builder = main.get_node("TrackBuilder")
	_director.set_process(false)

	await _test_barro_penaliza_grip_y_velocidad()
	await _test_hielo_penaliza_solo_el_grip()
	await _test_entra_y_sale_sin_reconstruir()
	await _test_transicion_no_salta()
	await _test_overlay_solo_en_celdas_pintadas()
	await _test_estela_cambia_de_color()

	GameSettings.set_track_id(TrackCatalog.DEFAULT_ID)

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_barro_penaliza_grip_y_velocidad() -> void:
	await _goto_track("chicane")
	var baseline_grip := _vehicle.grip
	var baseline_speed := _vehicle.speed_scale

	_teleport(Vector2i(-2, 3))
	await _settle()

	_check(_vehicle.grip < baseline_grip, true, "el barro reduce el agarre")
	_check(_vehicle.speed_scale < baseline_speed, true,
		"el barro también frena la velocidad punta")


func _test_hielo_penaliza_solo_el_grip() -> void:
	await _goto_track("nevado")
	var baseline_grip := _vehicle.grip
	var baseline_speed := _vehicle.speed_scale

	_teleport(Vector2i(-3, -1))
	await _settle()

	_check(_vehicle.grip < baseline_grip, true, "el hielo reduce el agarre")
	_check_almost_eq(_vehicle.speed_scale, baseline_speed,
		"el hielo NO frena la velocidad punta (se desliza, no se hunde)")


func _test_entra_y_sale_sin_reconstruir() -> void:
	await _goto_track("chicane")
	var before_grip := _vehicle.grip

	# Sin volver a llamar a rebuild_track en ningún momento de aquí en
	# adelante: el criterio de done es justo que esto cambie sin reconstruir.
	_teleport(Vector2i(-2, 3))
	await _settle()
	_check(_vehicle.grip < before_grip, true,
		"al entrar en el barro el agarre baja sin reconstruir nada")

	_teleport(Vector2i(0, 0))
	await _settle()
	_check_almost_eq(_vehicle.grip, before_grip,
		"al salir del barro el agarre vuelve a subir sin reconstruir nada")


func _test_transicion_no_salta() -> void:
	await _goto_track("chicane")
	var asphalt_grip := _vehicle.grip

	_teleport(Vector2i(-2, 3))
	await get_tree().physics_frame
	await get_tree().physics_frame
	var after_two_frames := _vehicle.grip

	await _settle()
	var settled := _vehicle.grip

	# Si fuera un salto, a los dos frames ya estaría (casi) donde termina. Con
	# un lerp, a los dos frames tiene que quedar más cerca de donde salió que
	# de donde va a converger.
	var distance_to_start := absf(after_two_frames - asphalt_grip)
	var distance_to_target := absf(after_two_frames - settled)
	_check(distance_to_start < distance_to_target, true,
		"la transición al barro se interpola en vez de saltar en 1-2 frames")


func _test_overlay_solo_en_celdas_pintadas() -> void:
	await _goto_track("kenney-01")
	_check(get_tree().get_nodes_in_group("terrain-overlay").size(), 0,
		"un circuito sin terreno pintado no monta overlays")

	await _goto_track("chicane")
	_check(get_tree().get_nodes_in_group("terrain-overlay").size(), 2,
		"la chicane monta un overlay por celda de barro pintada")

	# Reconstruir otra vez no debe ir acumulando overlays viejos.
	await _goto_track("chicane")
	_check(get_tree().get_nodes_in_group("terrain-overlay").size(), 2,
		"reconstruir no deja overlays duplicados")


func _test_estela_cambia_de_color() -> void:
	await _goto_track("chicane")
	var asphalt_color: Color = _vehicle._trail_material.color

	_teleport(Vector2i(-2, 3))
	# El raycast del coche solo se recoloca al FINAL de cada physics_process
	# (`raycast.position = sphere.position`); hace falta más de un frame para
	# que dé tiempo a moverlo y luego a leerlo, igual que con grip/speed_scale.
	await _settle()

	var mud_color: Color = _vehicle._trail_material.color
	_check(mud_color != asphalt_color, true,
		"la estela cambia de color al entrar en el barro")
	_check(mud_color, _vehicle._terrain_trail_colors[TrackTerrain.Kind.MUD],
		"y es justo el color de barro")

	_teleport(Vector2i(0, 0))
	await _settle()

	_check(_vehicle._trail_material.color, asphalt_color,
		"al volver al asfalto la estela recupera su color")


# --- Utilidades ---------------------------------------------------------------

func _goto_track(id: String) -> void:
	GameSettings.set_track_id(id)
	_director.rebuild_track()
	_director.restart()
	await _settle()


func _teleport(cell: Vector2i) -> void:
	_sphere.linear_velocity = Vector3.ZERO
	_sphere.angular_velocity = Vector3.ZERO
	_sphere.global_position = _builder.cell_center(cell) + Vector3(0, 0.5, 0)


func _settle() -> void:
	for i in SETTLE_FRAMES:
		await get_tree().physics_frame


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _check_almost_eq(got: float, want: float, label: String) -> void:
	_report(absf(got - want) < 0.01, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
