extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del fantasma de la vuelta récord (TASK-220):
##
##     godot --headless --quit-after 800 res://tests/ghost_test.tscn
##
## Sin `track_id_override`, a propósito, igual que `race_result_test.gd`: la
## grabación va enganchada al mismo camino que el resumen de resultado, y
## aquí se prueba la parte que no se ve mirando la pantalla — que se graba,
## que se guarda solo si bate el récord, y que la interpolación cae donde
## tiene que caer.

var _failures := 0
var _now: int = 0


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var timer: LapTimer = main.get_node("LapTimer")
	var director: RaceDirector = main.get_node("RaceDirector")
	var vehicle: Vehicle = main.get_node("Vehicle")
	var sphere: RigidBody3D = vehicle.get_node("Sphere")

	director.set_process(false)
	VehicleInput.locked = false
	timer.auto_start_on_throttle = false
	timer.clock = func() -> int: return _now

	var key := director.record_key()
	RaceRecords.clear(key)

	_test_sin_record_no_hay_fantasma(director)
	_test_grabar_una_vuelta_record(timer, director, sphere)
	_test_vuelta_mas_lenta_no_pisa_el_fantasma(timer, director, sphere)
	_test_interpolacion()

	RaceRecords.clear(key)

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_sin_record_no_hay_fantasma(director: RaceDirector) -> void:
	_check_eq(RaceRecords.best_ghost(director.record_key()), [], "sin récord previo, no hay fantasma grabado")
	_check(not director._ghost.visible, true, "y el fantasma en pantalla está oculto")


## Se llama a `_record_ghost_snapshot` directamente y no a través de
## `_process`: aquí no corren frames de verdad, y encadenar `_process` a mano
## se pelea con el bucle real del motor entre `await`. `elapsed_ms` es un
## campo público de `LapTimer` — se pone sin más, como ya hace `_now` con
## `clock`.
func _test_grabar_una_vuelta_record(timer: LapTimer, director: RaceDirector, sphere: RigidBody3D) -> void:
	timer.start()

	timer.elapsed_ms = 0
	director._record_ghost_snapshot()

	sphere.position = Vector3(1, 0, 0)
	timer.elapsed_ms = 500
	director._record_ghost_snapshot()

	sphere.position = Vector3(2, 0, 0)
	timer.elapsed_ms = 1000
	director._record_ghost_snapshot()

	# `cross_finish()` exige haber pasado antes por todos los checkpoints
	# intermedios (el antiatajo del propio `LapTimer`) — sin esto no cierra
	# la vuelta y no llega a `_on_lap_completed`.
	for i in timer.checkpoint_count:
		_now += 500
		timer.cross_checkpoint(i)

	_now += 2000
	timer.cross_finish()

	var key := director.record_key()
	var ghost := RaceRecords.best_ghost(key)
	_check(ghost.size() >= 2, true, "una vuelta récord deja al menos dos instantáneas grabadas")
	_check(director._ghost.visible, true, "y el fantasma en pantalla pasa a estar visible")


func _test_vuelta_mas_lenta_no_pisa_el_fantasma(timer: LapTimer, director: RaceDirector, sphere: RigidBody3D) -> void:
	var key := director.record_key()
	var before := RaceRecords.best_ghost(key)

	timer.start()
	timer.elapsed_ms = 0
	director._record_ghost_snapshot()
	sphere.position = Vector3(9, 0, 0)
	timer.elapsed_ms = 500
	director._record_ghost_snapshot()

	for i in timer.checkpoint_count:
		_now += 500
		timer.cross_checkpoint(i)

	_now += 5000
	timer.cross_finish()  # mucho más lenta: no es récord

	_check_eq(RaceRecords.best_ghost(key), before, "una vuelta más lenta no toca el fantasma guardado")


func _test_interpolacion() -> void:
	var ghost := Ghost.new()
	add_child(ghost)
	var snapshots := [
		{"t": 0, "pos": Vector3(0, 0, 0), "yaw": 0.0},
		{"t": 1000, "pos": Vector3(10, 0, 0), "yaw": 0.0},
	]
	ghost.set_snapshots(snapshots)

	ghost.update_at(500)
	_check(ghost.position.distance_to(Vector3(5, 0, 0)) < 0.001, true, "a mitad de camino, la posición interpolada es el punto medio")

	ghost.update_at(0)
	_check_eq(ghost.position, Vector3(0, 0, 0), "en t=0 cae exactamente en la primera instantánea")

	ghost.update_at(5000)
	_check_eq(ghost.position, Vector3(10, 0, 0), "pasado el final, se queda en la última instantánea")

	ghost.set_snapshots([])
	_check(not ghost.visible, true, "sin instantáneas, el fantasma se oculta")

	ghost.free()


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _check_eq(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
