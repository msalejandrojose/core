extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del semáforo de salida:
##
##     godot --quit-after 1800 res://tests/countdown_test.tscn
##
## La cuenta atrás se pilota a mano llamando a `_process` con el delta que
## interese, en vez de esperar los 2,4 s reales. El test tarda milisegundos y
## no depende del framerate de la máquina que lo corra.

var _failures := 0
var _lights: Array = []
var _finished := false


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var director: RaceDirector = main.get_node("RaceDirector")
	var timer: LapTimer = main.get_node("LapTimer")

	# Se congela el _process automático para controlar el reloj desde aquí.
	director.set_process(false)
	director.countdown_changed.connect(func(on, total): _lights.append([on, total]))
	director.countdown_finished.connect(func(): _finished = true)

	director.begin_countdown()

	_check(director.counting_down, true, "arranca contando")
	_check(VehicleInput.locked, true, "el coche queda bloqueado durante la cuenta")
	_check(timer.running, false, "el crono no corre durante la cuenta")

	# El input se ignora aunque se empuje el acelerador a fondo.
	VehicleInput.throttle = 1.0
	VehicleInput._process(0.016)
	_check_eq(VehicleInput.throttle, 0.0, "el acelerador no cuenta durante la cuenta")

	_lights.clear()
	director._process(RaceDirector.LIGHT_INTERVAL_S)
	_check_eq(_lights[-1][0], 1, "tras el primer intervalo, una luz")

	director._process(RaceDirector.LIGHT_INTERVAL_S)
	_check_eq(_lights[-1][0], 2, "tras el segundo, dos luces")

	director._process(RaceDirector.LIGHT_INTERVAL_S)
	_check_eq(_lights[-1][0], 3, "tras el tercero, las tres luces")

	_check(_finished, false, "las tres luces se ven antes del GO")
	_check(timer.running, false, "el crono sigue parado con las tres luces")

	director._process(RaceDirector.LIGHT_INTERVAL_S)
	_check(_finished, true, "un intervalo después de la última luz, GO")
	_check(director.counting_down, false, "deja de contar")
	_check(VehicleInput.locked, false, "el GO desbloquea el coche")
	_check(timer.running, true, "el crono arranca en el GO")
	_check_eq(timer.elapsed_ms, 0, "el crono arranca desde cero")

	# --- Reiniciar tiene que rearmar el semáforo -------------------------------
	_finished = false
	director.restart()

	_check(director.counting_down, true, "reiniciar relanza la cuenta atrás")
	_check(VehicleInput.locked, true, "reiniciar vuelve a bloquear el coche")
	_check(timer.running, false, "reiniciar para el crono hasta el nuevo GO")

	VehicleInput.locked = false

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


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
