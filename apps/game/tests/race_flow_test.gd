extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del flujo de carrera sobre la escena real:
##
##     godot --quit-after 1800 res://tests/race_flow_test.tscn
##
## Cubre lo que el usuario nota: que reiniciar deje el coche parado en la
## salida y sin inercia, que el récord se guarde, y que el delta contra ese
## récord salga con el signo correcto.

const TRACK := "test-kenney-01"
## La clave de récord compone circuito, sentido, cilindrada y arquetipo. Se
## escribe entera a mano y no llamando a `key_for`: un test que usa la misma
## función que el código no comprueba el formato, solo que coincide consigo
## mismo.
const KEY := "test-kenney-01-100cc-normal"

var _failures := 0
var _now: int = 0
var _deltas: Array = []
var _records: Array = []


func _ready() -> void:
	TestEnv.reset()
	RaceRecords.clear(KEY)

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var timer: LapTimer = main.get_node("LapTimer")
	var director: RaceDirector = main.get_node("RaceDirector")
	var vehicle: Vehicle = main.get_node("Vehicle")
	var sphere: RigidBody3D = main.get_node("Vehicle/Sphere")

	director.track_id_override = TRACK

	# El semáforo tiene su propio test (countdown_test). Aquí se congela para
	# que no suelte el coche a mitad de las comprobaciones.
	director.set_process(false)
	VehicleInput.locked = false
	timer.auto_start_on_throttle = false
	director.sector_delta.connect(func(cp, d, has): _deltas.append([cp, d, has]))
	director.record_beaten.connect(func(d): _records.append(d))

	# El reloj tiene que leer una variable MIEMBRO: una lambda de GDScript captura
	# las locales por valor, así que `func(): return una_local` se queda congelada
	# en el valor que tuviera al crearse y el crono devuelve siempre lo mismo.
	timer.clock = func() -> int: return _now

	# --- Vuelta 1: es el récord porque no había ninguno ------------------------
	timer.start()
	_now += 5000; timer.cross_checkpoint(0)
	_now += 5000; timer.cross_checkpoint(1)
	_now += 5000; timer.cross_checkpoint(2)
	_now += 5000; timer.cross_finish()

	_check_eq(_records.size(), 1, "la primera vuelta entra como récord")
	_check_eq(RaceRecords.best_ms(KEY), 20000, "el récord guardado es el correcto")
	_check(_deltas[0][2], false, "sin referencia previa no se muestra delta")

	# --- Vuelta 2: primer sector más rápido, luego más lenta en total ---------
	_deltas.clear()
	_now += 4000; timer.cross_checkpoint(0)
	_now += 9000; timer.cross_checkpoint(1)
	_now += 5000; timer.cross_checkpoint(2)
	_now += 5000; timer.cross_finish()

	_check(_deltas[0][2], true, "con récord guardado ya hay delta")
	_check_eq(_deltas[0][1], -1000, "sector más rápido da delta negativo")
	_check_eq(_deltas[1][1], 3000, "sector más lento da delta positivo")
	_check_eq(_records.size(), 1, "una vuelta más lenta no pisa el récord")
	_check_eq(RaceRecords.best_ms(KEY), 20000, "el récord sigue siendo el bueno")

	# --- Reinicio -------------------------------------------------------------
	sphere.position = Vector3(12, 0.5, -7)
	sphere.linear_velocity = Vector3(9, 0, 4)
	vehicle.linear_speed = 0.8
	await get_tree().physics_frame

	var before := Time.get_ticks_msec()
	director.restart()
	var restart_ms := Time.get_ticks_msec() - before

	_check(restart_ms < 1000, true, "el reinicio tarda menos de 1 s (%d ms)" % restart_ms)
	# El reinicio recoloca la esfera en la línea de meta REAL del circuito
	# (`builder.start_position`), no en el origen del mundo — antes salía casi
	# por casualidad porque el kenney-01 tiene meta en (0,0,0) y el fallback
	# a la posición local de la escena coincidía; con la nueva firma explícita
	# de `reset_to_start(yaw, spawn)` esto queda cerrado por contrato.
	var builder: TrackBuilder = main.get_node("TrackBuilder")
	var expected_spawn := builder.start_position + Vector3(0, 0.5, 0)
	_check(sphere.global_position.distance_to(expected_spawn) < 0.001, true, "el coche vuelve a la salida")
	_check(sphere.linear_velocity.length() < 0.001, true, "el reinicio quita la inercia")
	_check_eq(vehicle.linear_speed, 0.0, "el reinicio limpia la velocidad interna")
	_check(timer.running, false, "el reinicio para el crono")
	_check(director.counting_down, true, "el reinicio rearma el semáforo")
	_check_eq(timer.remaining_checkpoints(), 3, "el reinicio olvida los checkpoints")

	# --- Formato --------------------------------------------------------------
	var hud := load("res://scripts/ui/race_hud.gd")
	_check_eq(hud.format_ms(67482), "1:07.482", "formato de tiempo")
	_check_eq(hud.format_ms(482), "0:00.482", "formato con ceros a la izquierda")
	_check_eq(hud.format_delta_ms(-412), "-0.412", "formato de delta negativo")
	_check_eq(hud.format_delta_ms(3000), "+3.000", "formato de delta positivo")

	RaceRecords.clear(KEY)

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
