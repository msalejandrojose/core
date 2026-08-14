extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de que el arquetipo/piezas equipados (`CarLoadout`) cambian de
## verdad la física del coche y su modelo visual, y que el modificador fuera
## de asfalto penaliza distinto a cada arquetipo en un circuito nevado:
##
##     godot --headless --quit-after 200 res://tests/car_loadout_test.tscn

var _failures := 0
var _director: RaceDirector
var _vehicle: Vehicle


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	_director = main.get_node("RaceDirector")
	_vehicle = main.get_node("Vehicle")
	_director.set_process(false)

	_test_default_normal_en_asfalto()
	await _test_arquetipo_cambia_grip_y_velocidad()
	await _test_modelo_cambia_con_el_arquetipo()
	await _test_offroad_penaliza_distinto_por_arquetipo()

	_reset_car_loadout()
	GameSettings.set_track_id(TrackCatalog.DEFAULT_ID)

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_default_normal_en_asfalto() -> void:
	_reset_car_loadout()
	_director.rebuild_track()

	_check_eq(_vehicle.grip, 1.0, "sin equipar nada, grip normal en asfalto es 1.0")
	_check_eq(_vehicle.speed_scale, GameSettings.engine_speed(), "sin equipar nada, speed_scale es solo la cilindrada")


func _test_arquetipo_cambia_grip_y_velocidad() -> void:
	_reset_car_loadout()
	_director.rebuild_track()

	CarLoadout.archetype_code = "f1"
	CarLoadout.speed_scale = 1.2
	CarLoadout.grip = 1.1
	CarLoadout.offroad_grip_modifier = 0.85
	CarLoadout.changed.emit()
	await get_tree().physics_frame

	_check_almost_eq(_vehicle.grip, 1.1, "el grip del arquetipo se aplica en asfalto")
	_check_almost_eq(_vehicle.speed_scale, 1.2 * GameSettings.engine_speed(),
		"la velocidad del arquetipo se combina con la cilindrada")


func _test_modelo_cambia_con_el_arquetipo() -> void:
	var cases := [
		["normal", "res://models/vehicle-truck-yellow.glb"],
		["f1", "res://models/vehicle-truck-red.glb"],
		["4x4", "res://models/vehicle-truck-green.glb"],
	]
	for case in cases:
		_reset_car_loadout()
		CarLoadout.archetype_code = case[0]
		CarLoadout.changed.emit()
		await get_tree().physics_frame

		var model := _vehicle.get_node("Container/Model")
		_check_eq(model.scene_file_path, case[1], "el arquetipo %s monta %s" % [case[0], case[1]])
		_check(_vehicle.vehicle_body != null, true,
			"el cuerpo se resuelve tras cambiar de modelo (%s)" % case[0])


func _test_offroad_penaliza_distinto_por_arquetipo() -> void:
	GameSettings.set_track_id("nevado")
	_director.rebuild_track()

	_reset_car_loadout()
	CarLoadout.archetype_code = "f1"
	CarLoadout.grip = 1.0
	CarLoadout.offroad_grip_modifier = 0.85
	CarLoadout.changed.emit()
	await get_tree().physics_frame
	var f1_grip := _vehicle.grip

	_reset_car_loadout()
	CarLoadout.archetype_code = "4x4"
	CarLoadout.grip = 1.0
	CarLoadout.offroad_grip_modifier = 1.15
	CarLoadout.changed.emit()
	await get_tree().physics_frame
	var suv_grip := _vehicle.grip

	_check(suv_grip > f1_grip, true,
		"en nieve el 4x4 conserva más grip que el F1 (%.3f vs %.3f)" % [suv_grip, f1_grip])

	GameSettings.set_track_id(TrackCatalog.DEFAULT_ID)
	_director.rebuild_track()


# --- Utilidades ---------------------------------------------------------------

func _reset_car_loadout() -> void:
	CarLoadout.archetype_code = CarLoadout.DEFAULT_ARCHETYPE_CODE
	CarLoadout.speed_scale = 1.0
	CarLoadout.grip = 1.0
	CarLoadout.offroad_grip_modifier = 1.0


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _check_eq(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _check_almost_eq(got: float, want: float, label: String) -> void:
	_report(absf(got - want) < 0.001, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
