extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del resumen al completar una vuelta en solitario (TASK-260):
##
##     godot --headless --quit-after 800 res://tests/race_result_test.tscn
##
## Sin `track_id_override`, a propósito: ese campo existe justo para que un
## arnés de test NO dispare esto (ver el comentario de `lap_finished` en
## `race_director.gd`) — aquí se prueba exactamente lo contrario, que una
## carrera "real" sí lo hace.

var _failures := 0
var _now: int = 0
var _events: Array = []


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var timer: LapTimer = main.get_node("LapTimer")
	var director: RaceDirector = main.get_node("RaceDirector")
	var race_hud: CanvasLayer = main.get_node("RaceHud")

	director.set_process(false)
	VehicleInput.locked = false
	timer.auto_start_on_throttle = false
	timer.clock = func() -> int: return _now

	var key := director.record_key()
	RaceRecords.clear(key)

	director.lap_finished.connect(func(d, prev, is_record):
		_events.append([d, prev, is_record]))

	_run_lap(timer, 40000)
	_check_eq(_events.size(), 1, "sin carrera de arnés, la vuelta SÍ emite lap_finished")
	_check_eq(_events[0][0], 40000, "con el tiempo de la vuelta")
	_check_eq(_events[0][1], null, "sin marca previa, previous_best_ms es null")
	_check_eq(_events[0][2], true, "la primera vuelta siempre es récord")

	_check(VehicleInput.locked, true, "al terminar, la pantalla de resultado bloquea el mando")

	var screen := _find_result_screen(race_hud)
	_check(screen != null, true, "el HUD instancia la pantalla de resultado")

	# --- Segunda vuelta, más lenta: ya hay marca previa que batir -------------
	_events.clear()
	if screen != null:
		screen.queue_free()
		await get_tree().process_frame

	director.restart()
	_run_lap(timer, 45000)

	_check_eq(_events.size(), 1, "la segunda vuelta también emite lap_finished")
	_check_eq(_events[0][1], 40000, "esta vez sí hay marca previa: la de la vuelta anterior")
	_check_eq(_events[0][2], false, "más lenta que la anterior: no es récord")

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _run_lap(timer: LapTimer, duration_ms: int) -> void:
	timer.start()
	var third := duration_ms / 4
	_now += third; timer.cross_checkpoint(0)
	_now += third; timer.cross_checkpoint(1)
	_now += third; timer.cross_checkpoint(2)
	_now += duration_ms - third * 3; timer.cross_finish()


## Recursivo y no un simple `get_children()`: el nodo "RaceHud" de `main.tscn`
## es una instancia de sub-escena, y su script real (donde se llama
## `add_child`) vive uno o más niveles por debajo, no en la raíz.
func _find_result_screen(root: Node) -> Node:
	var script: Script = root.get_script()
	if script != null and script.resource_path.ends_with("race_result_screen.gd"):
		return root
	for child in root.get_children():
		var found := _find_result_screen(child)
		if found != null:
			return found
	return null


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
