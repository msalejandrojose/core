extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del sentido inverso y del esquema de control alternativo:
##
##     godot --quit-after 1800 res://tests/settings_test.tscn
##
## Cubre las dos consecuencias que no se ven mirando la pantalla: que en
## inverso la vuelta solo valide cruzando los checkpoints al revés, y que cada
## sentido guarde su récord por separado.

const TRACK := "test-settings"
const KEY := "test-settings-100cc"
const KEY_REV := "test-settings-rev-100cc"

var _failures := 0
var _now: int = 0
var _pad: Control


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var timer: LapTimer = main.get_node("LapTimer")
	var director: RaceDirector = main.get_node("RaceDirector")
	_pad = main.get_node("TouchControls/Pad")

	director.track_id_override = TRACK
	director.set_process(false)
	timer.auto_start_on_throttle = false
	timer.clock = func() -> int: return _now
	RaceRecords.clear(KEY)
	RaceRecords.clear(KEY_REV)

	await _test_orden_normal(timer, director)
	await _test_orden_inverso(timer, director)
	await _test_records_separados(timer, director)
	await _test_esquema_toque(director)

	RaceRecords.clear(KEY)
	RaceRecords.clear(KEY_REV)
	TestEnv.reset()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_orden_normal(timer: LapTimer, _d: RaceDirector) -> void:
	timer.set_reversed(false)
	VehicleInput.locked = false
	timer.start()

	_check(timer.cross_checkpoint(2), false, "normal: empezar por el último no cuenta")
	_check(timer.cross_checkpoint(0), true, "normal: el orden es 0, 1, 2")


func _test_orden_inverso(timer: LapTimer, _d: RaceDirector) -> void:
	timer.set_reversed(true)
	timer.start()

	_check(timer.cross_checkpoint(0), false, "inverso: el 0 ya no va primero")
	_check(timer.cross_checkpoint(2), true, "inverso: se empieza por el 2")
	_check(timer.cross_checkpoint(1), true, "inverso: sigue el 1")
	_check(timer.cross_finish(), false, "inverso: falta el 0 para cerrar")
	_check(timer.cross_checkpoint(0), true, "inverso: termina en el 0")
	_check(timer.cross_finish(), true, "inverso: ahora sí cierra la vuelta")


func _test_records_separados(timer: LapTimer, director: RaceDirector) -> void:
	GameSettings.set_reverse(false)
	director.set_process(false)
	_check_eq(director.record_key(), KEY, "en normal la clave lleva circuito y cilindrada")

	timer.set_reversed(false)
	timer.start()
	_now += 10000; timer.cross_checkpoint(0)
	_now += 10000; timer.cross_checkpoint(1)
	_now += 10000; timer.cross_checkpoint(2)
	_now += 10000; timer.cross_finish()

	_check_eq(RaceRecords.best_ms(KEY), 40000, "el récord normal se guarda")

	GameSettings.set_reverse(true)
	director.set_process(false)
	_check_eq(director.record_key(), KEY_REV, "en inverso la clave lleva además el sentido")
	_check_eq(RaceRecords.best_ms(KEY_REV), 0, "el inverso empieza sin récord")

	timer.set_reversed(true)
	timer.start()
	_now += 20000; timer.cross_checkpoint(2)
	_now += 20000; timer.cross_checkpoint(1)
	_now += 20000; timer.cross_checkpoint(0)
	_now += 20000; timer.cross_finish()

	_check_eq(RaceRecords.best_ms(KEY_REV), 80000, "el récord inverso se guarda aparte")
	_check_eq(RaceRecords.best_ms(KEY), 40000, "una vuelta inversa más lenta no toca el normal")

	GameSettings.set_reverse(false)
	director.set_process(false)


func _test_esquema_toque(director: RaceDirector) -> void:
	GameSettings.set_control_scheme(GameSettings.ControlScheme.TAP)
	director.set_process(false)
	VehicleInput.locked = false
	await _frames(3)

	# Sin tocar nada, el gas va puesto: es la premisa del esquema.
	_check_eq(VehicleInput.throttle, 1.0, "toque: el acelerador va puesto solo")

	await _touch(0, Vector2(_pad.size.x * 0.2, _pad.size.y * 0.6), true)
	await _frames(30)
	_check(VehicleInput.steer < -0.5, true, "toque: la izquierda gira a la izquierda")
	await _touch(0, Vector2(_pad.size.x * 0.2, _pad.size.y * 0.6), false)

	await _touch(0, Vector2(_pad.size.x * 0.8, _pad.size.y * 0.6), true)
	await _frames(30)
	_check(VehicleInput.steer > 0.5, true, "toque: la derecha gira a la derecha")
	await _touch(0, Vector2(_pad.size.x * 0.8, _pad.size.y * 0.6), false)

	await _frames(30)
	_check(absf(VehicleInput.steer) < 0.1, true, "toque: al soltar, el volante se centra")

	# El freno está separado de las zonas de giro para poder hacer las dos cosas.
	var brake: Vector2 = _pad.call("_tap_brake_center")
	await _touch(1, brake, true)
	await _frames(3)
	_check_eq(VehicleInput.throttle, -1.0, "toque: el freno corta el gas")

	await _touch(2, Vector2(_pad.size.x * 0.2, _pad.size.y * 0.6), true)
	await _frames(30)
	_check(VehicleInput.steer < -0.5, true, "toque: se puede frenar y girar a la vez")

	await _touch(1, brake, false)
	await _touch(2, Vector2(_pad.size.x * 0.2, _pad.size.y * 0.6), false)


# --- Utilidades ---------------------------------------------------------------

func _touch(index: int, pos: Vector2, pressed: bool) -> void:
	var e := InputEventScreenTouch.new()
	e.index = index
	e.position = get_viewport().get_final_transform() * pos
	e.pressed = pressed
	get_viewport().push_input(e)
	await _frames(3)


func _frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame


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
