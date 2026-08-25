extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del contrarreloj de 3 vueltas en RaceDirector (TASK-312):
##
##     godot --headless --quit-after 800 res://tests/time_trial_flow_test.tscn
##
## Cubre lo que no se puede ver a simple vista: que las 3 vueltas se suman
## sin tocar el leaderboard normal ni el fantasma, que termina solo (sin
## dejar una 4ª vuelta fantasma corriendo tras la última), que reiniciar a
## mitad no pierde las vueltas ya hechas, y que volver al menú abandona el
## intento entero.

var _failures := 0
var _now: int = 0

var _lap_completions: Array = []  # cada uno [lap_number, duration_ms, total_ms]
var _finished: Array = []  # cada uno [total_ms, lap_times_ms]
var _started := 0
var _deltas: Array = []
var _records: Array = []


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
	director.time_trial_started.connect(func(): _started += 1)
	director.time_trial_lap_completed.connect(
		func(lap, d, total): _lap_completions.append([lap, d, total]))
	director.time_trial_finished.connect(
		func(total, laps): _finished.append([total, laps]))
	director.sector_delta.connect(func(cp, d, has): _deltas.append([cp, d, has]))
	director.record_beaten.connect(func(d): _records.append(d))
	timer.clock = func() -> int: return _now

	_test_arranca_el_modo(director, timer)
	_test_tres_vueltas_sin_tocar_leaderboard(director, timer)
	_test_no_deja_una_cuarta_vuelta_fantasma(director, timer)
	_test_reiniciar_a_mitad_no_pierde_lo_hecho(director, timer)
	_test_hud_contador_y_pantalla_final(director, timer, race_hud)
	_test_menu_abandona_el_intento(director, timer)

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_arranca_el_modo(director: RaceDirector, _timer: LapTimer) -> void:
	director.start_time_trial()

	_check(director.in_time_trial(), true, "arrancar el contrarreloj entra en el modo")
	_check_eq(_started, 1, "avisa con time_trial_started")


func _test_tres_vueltas_sin_tocar_leaderboard(director: RaceDirector, timer: LapTimer) -> void:
	var key := director.record_key()
	RaceRecords.clear(key)
	_lap_completions.clear()
	_finished.clear()
	_deltas.clear()
	_records.clear()

	timer.start()
	_drive_one_lap(timer, 2000)  # vuelta 1: 8000 ms (3 checkpoints + meta, a 2000 ms cada tramo)
	_drive_one_lap(timer, 3000)  # vuelta 2: 12000 ms
	_drive_one_lap(timer, 1000)  # vuelta 3: 4000 ms

	_check_eq(_lap_completions, [[1, 8000, 8000], [2, 12000, 20000]],
		"avisa vuelta a vuelta con el total acumulado (sin la última, que es time_trial_finished)")
	_check_eq(_finished, [[24000, [8000, 12000, 4000]]],
		"al completar la 3ª vuelta, suma el total y da el desglose")
	_check_eq(_records.size(), 0, "no toca el récord/fantasma de la vuelta suelta")
	_check(not RaceRecords.has_best(key), true, "el circuito del menú se queda sin marca")
	_check(_deltas[0][2], false, "sin referencia: el récord de la vuelta suelta no compara con el contrarreloj")


func _test_no_deja_una_cuarta_vuelta_fantasma(director: RaceDirector, timer: LapTimer) -> void:
	# `cross_finish()` encadena la vuelta siguiente ANTES de que
	# `time_trial_finished` pueda pararla — sin `lap_timer.abort()` en
	# `RaceDirector`, esto seguiría corriendo y una vuelta más caería por la
	# rama normal (justo lo que el modo tiene prohibido tocar).
	_check(director.in_time_trial(), false, "el modo se apaga solo al terminar")
	_check(not timer.running, true, "y el cronómetro no se deja corriendo detrás")

	_records.clear()
	_check(timer.cross_finish(), false, "cruzar la meta otra vez ya no cuenta nada")
	_check_eq(_records.size(), 0, "así que tampoco puede colarse como récord normal")


func _test_reiniciar_a_mitad_no_pierde_lo_hecho(director: RaceDirector, timer: LapTimer) -> void:
	director.start_time_trial()
	_lap_completions.clear()
	_finished.clear()

	timer.start()
	_drive_one_lap(timer, 1000)  # vuelta 1 completada: 4000 ms

	# Reiniciar a mitad de la vuelta 2 vuelve a la salida (mismo `restart()`
	# de siempre) pero NO debe olvidar que la vuelta 1 ya está hecha.
	director.restart()
	_check(director.in_time_trial(), true, "reiniciar a mitad no abandona el contrarreloj")

	timer.start()
	_drive_one_lap(timer, 500)  # la vuelta 2 de verdad: 2000 ms

	_check_eq(_lap_completions, [[1, 4000, 4000], [2, 2000, 6000]],
		"la vuelta 1 ya contada sigue sumando después de un reinicio a mitad")


## Continúa justo donde lo dejó `_test_reiniciar_a_mitad_no_pierde_lo_hecho`
## (vuelta 2 de 3 ya contada, vuelta 3 en marcha): la corre entera y
## comprueba que el HUD lleva la cuenta y que al terminar abre su propia
## pantalla de resultado (no la de la vuelta suelta) con el mando bloqueado.
func _test_hud_contador_y_pantalla_final(
	director: RaceDirector, timer: LapTimer, race_hud: CanvasLayer,
) -> void:
	# `RaceHud` en `main.tscn` es una instancia de sub-escena: el script real
	# (donde vive `_lap_counter_label`) está uno o más niveles por debajo,
	# igual que ya documenta `race_result_test.gd`.
	var hud_node := _find_screen(race_hud, "race_hud.gd")
	var counter: Label = hud_node._lap_counter_label
	_check(counter.visible, true, "el HUD muestra el contador de vuelta durante el contrarreloj")
	_check_eq(counter.text, "Vuelta 3/3", "va por la vuelta 3 tras el reinicio de la prueba anterior")

	VehicleInput.locked = false
	_drive_one_lap(timer, 200)  # vuelta 3, la última: 800 ms

	_check(counter.visible, false, "al terminar, el contador de vuelta se esconde")
	_check(VehicleInput.locked, true, "la pantalla de resultado del contrarreloj bloquea el mando")

	var screen := _find_screen(race_hud, "time_trial_result_screen.gd")
	_check(screen != null, true, "el HUD abre la pantalla de resultado del contrarreloj")
	_check(_find_screen(race_hud, "race_result_screen.gd") == null, true,
		"y no la de la vuelta suelta")

	if screen != null:
		screen.queue_free()
		await get_tree().process_frame


## Recursivo y no un simple `get_children()`: `race_hud`/las pantallas que
## instancia viven en subárboles de escena, no como hijos directos.
func _find_screen(root: Node, script_filename: String) -> Node:
	var script: Script = root.get_script()
	if script != null and script.resource_path.ends_with(script_filename):
		return root
	for child in root.get_children():
		var found := _find_screen(child, script_filename)
		if found != null:
			return found
	return null


func _test_menu_abandona_el_intento(director: RaceDirector, _timer: LapTimer) -> void:
	director.open_menu()

	_check(director.in_time_trial(), false, "volver al menú abandona el contrarreloj")


## Cruza los 3 checkpoints y la meta, cada uno `step_ms` después del
## anterior — 4 tramos en total (los 3 checkpoints del circuito del menú por
## defecto, kenney-01, más la meta).
func _drive_one_lap(timer: LapTimer, step_ms: int) -> void:
	for i in 3:
		_now += step_ms
		timer.cross_checkpoint(i)
	_now += step_ms
	timer.cross_finish()


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
