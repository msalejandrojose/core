extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del nitro:
##
##     godot --quit-after 2400 res://tests/nitro_test.tscn
##
## Lo que importa aquí no es que el botón exista, sino que el depósito sea un
## límite de verdad: que se gaste, que no se pueda usar vacío, y que empujar de
## verdad haga ir más rápido. Sin eso el nitro no es una decisión.

var _failures := 0
var _vehicle: Vehicle
var _director: RaceDirector


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	_vehicle = main.get_node("Vehicle")
	_director = main.get_node("RaceDirector")
	_director.set_process(false)
	VehicleInput.touch_active = true

	await _test_arranca_lleno()
	await _test_se_gasta_al_usarlo()
	await _test_no_se_gasta_sin_acelerar()
	await _test_se_recarga_al_soltarlo()
	await _test_vacio_no_empuja()
	await _test_empuja_de_verdad()
	await _test_reiniciar_rellena()

	_release()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_arranca_lleno() -> void:
	_reset()
	await get_tree().physics_frame
	_check_eq(_vehicle.nitro_charge, 1.0, "el depósito arranca lleno")


func _test_se_gasta_al_usarlo() -> void:
	_reset()
	await _drive(30, 1.0, true)
	_check(_vehicle.nitro_charge < 1.0, true, "usarlo gasta depósito")
	_check(_vehicle.nitro_active, true, "y mientras se usa, está activo")


func _test_no_se_gasta_sin_acelerar() -> void:
	_reset()
	# Pulsar nitro sin gas no debería consumir: el empuje es hacia delante.
	await _drive(30, 0.0, true)
	_check(_vehicle.nitro_active, false, "sin acelerar no empuja")
	_check_eq(_vehicle.nitro_charge, 1.0, "ni gasta depósito")


func _test_se_recarga_al_soltarlo() -> void:
	_reset()
	await _drive(40, 1.0, true)
	var gastado := _vehicle.nitro_charge
	await _drive(60, 1.0, false)
	_check(_vehicle.nitro_charge > gastado, true, "al soltarlo se recarga")


func _test_vacio_no_empuja() -> void:
	_reset()
	# Vaciar del todo y comprobar que se apaga solo.
	_vehicle.nitro_charge = 0.0
	await _drive(10, 1.0, true)
	_check(_vehicle.nitro_active, false, "con el depósito vacío no empuja")

	# Y con restos por debajo del mínimo tampoco arranca: pulsar y que dé un
	# empujoncito de dos frames sería peor que no responder.
	_vehicle.nitro_charge = Vehicle.NITRO_MIN_CHARGE * 0.5
	await _drive(10, 1.0, true)
	_check(_vehicle.nitro_active, false, "con restos por debajo del mínimo, tampoco")


func _test_empuja_de_verdad() -> void:
	var sin_nitro := await _distancia(90, false)
	var con_nitro := await _distancia(90, true)

	_check(con_nitro > sin_nitro * 1.15, true,
		"con nitro se llega más lejos (%.1f vs %.1f)" % [con_nitro, sin_nitro])


func _test_reiniciar_rellena() -> void:
	_reset()
	await _drive(40, 1.0, true)
	_check(_vehicle.nitro_charge < 1.0, true, "queda gastado antes de reiniciar")

	_director.restart()
	await get_tree().physics_frame
	_check_eq(_vehicle.nitro_charge, 1.0, "reiniciar rellena el depósito")


# --- Utilidades ---------------------------------------------------------------

func _reset() -> void:
	_director.restart()
	VehicleInput.locked = false
	VehicleInput.touch_active = true


func _release() -> void:
	VehicleInput.throttle = 0.0
	VehicleInput.nitro = false
	VehicleInput.touch_active = false


## Conduce N frames de física manteniendo gas y nitro. Se reafirman en cada
## frame porque el autoload los reescribe si suelta el control.
func _drive(frames: int, throttle: float, nitro: bool) -> void:
	for i in frames:
		VehicleInput.touch_active = true
		VehicleInput.throttle = throttle
		VehicleInput.steer = 0.0
		VehicleInput.nitro = nitro
		await get_tree().physics_frame


func _distancia(frames: int, nitro: bool) -> float:
	_reset()
	await get_tree().physics_frame
	var sphere: RigidBody3D = _vehicle.get_node("Sphere")
	var desde := sphere.global_position
	await _drive(frames, 1.0, nitro)
	return desde.distance_to(sphere.global_position)


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
