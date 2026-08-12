extends Node

## Banco de pruebas del cronómetro:
##
##     godot res://tests/lap_timer_test.tscn
##
## El reloj se inyecta, así que no hay esperas reales ni resultados que
## dependan del framerate: los tiempos son exactos y comparables entre
## ejecuciones. Es la misma razón por la que los tiempos son enteros.

const LapTimerScript := preload("res://scripts/timing/lap_timer.gd")

var _now: int = 0
var _failures := 0


func _ready() -> void:
	_test_lap_completa()
	_test_meta_sin_checkpoints_no_cuenta()
	_test_checkpoint_fuera_de_orden_no_cuenta()
	_test_splits_monotonos_y_ultimo_igual_a_duracion()
	_test_vueltas_encadenadas_sin_perder_tiempo()
	_test_abort_descarta_la_vuelta()
	_test_sin_arrancar_no_registra_nada()

	if _failures == 0:
		print("\nOK — 7/7")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_lap_completa() -> void:
	var t := _make()
	t.start()

	_now += 4000; _check(t.cross_checkpoint(0), true, "checkpoint 0 cuenta")
	_now += 5000; _check(t.cross_checkpoint(1), true, "checkpoint 1 cuenta")
	_now += 3000; _check(t.cross_checkpoint(2), true, "checkpoint 2 cuenta")
	_now += 2500; _check(t.cross_finish(), true, "meta completa la vuelta")

	var res: Array = _last_lap
	_check_eq(res[0], 14500, "duración de la vuelta")
	_free(t)


func _test_meta_sin_checkpoints_no_cuenta() -> void:
	var t := _make()
	t.start()

	_now += 1000; t.cross_checkpoint(0)
	# Atajo: se salta el 1 y el 2 y se planta en la meta.
	_now += 500
	_check(t.cross_finish(), false, "atajo a meta rechazado")
	_check(t.running, true, "tras el atajo la vuelta sigue viva")
	_free(t)


func _test_checkpoint_fuera_de_orden_no_cuenta() -> void:
	var t := _make()
	t.start()

	_now += 1000
	_check(t.cross_checkpoint(2), false, "checkpoint adelantado rechazado")
	_check_eq(t.remaining_checkpoints(), 3, "sigue faltando cruzar los 3")
	_free(t)


func _test_splits_monotonos_y_ultimo_igual_a_duracion() -> void:
	var t := _make()
	t.start()

	_now += 3000; t.cross_checkpoint(0)
	_now += 3000; t.cross_checkpoint(1)
	_now += 3000; t.cross_checkpoint(2)
	_now += 3000; t.cross_finish()

	var duration: int = _last_lap[0]
	var splits: Array = _last_lap[1]

	_check_eq(splits.size(), t.sector_count(), "un split por sector")
	_check_eq(splits[-1], duration, "el último split es la duración")

	var monotonic := true
	for i in range(1, splits.size()):
		if splits[i] <= splits[i - 1]:
			monotonic = false
	_check(monotonic, true, "splits estrictamente crecientes")
	_free(t)


func _test_vueltas_encadenadas_sin_perder_tiempo() -> void:
	var t := _make()
	t.start()

	_now += 10000
	t.cross_checkpoint(0); t.cross_checkpoint(1); t.cross_checkpoint(2)
	t.cross_finish()

	# Segunda vuelta: debe contar desde el instante exacto del cruce anterior.
	_now += 8000
	t.cross_checkpoint(0); t.cross_checkpoint(1); t.cross_checkpoint(2)
	t.cross_finish()

	_check_eq(_last_lap[0], 8000, "la 2ª vuelta arranca en el cruce, sin hueco")
	_free(t)


func _test_abort_descarta_la_vuelta() -> void:
	var t := _make()
	t.start()

	_now += 5000; t.cross_checkpoint(0)
	t.abort()

	_check(t.running, false, "abort para el crono")
	_check_eq(t.remaining_checkpoints(), 3, "abort olvida los checkpoints")
	_free(t)


func _test_sin_arrancar_no_registra_nada() -> void:
	var t := _make()
	_check(t.cross_checkpoint(0), false, "sin arrancar, checkpoint no cuenta")
	_check(t.cross_finish(), false, "sin arrancar, meta no cuenta")
	_free(t)


# --- Utilidades ---------------------------------------------------------------

var _last_lap: Array = []


func _make() -> LapTimer:
	var t: LapTimer = LapTimerScript.new()
	t.auto_start_on_throttle = false
	t.checkpoint_count = 3
	t.clock = func() -> int: return _now
	add_child(t)
	t.lap_completed.connect(func(d, s): _last_lap = [d, s])
	return t


func _free(t: Node) -> void:
	remove_child(t)
	t.queue_free()


func _check(got: bool, want: bool, label: String) -> void:
	if got == want:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1


func _check_eq(got, want, label: String) -> void:
	if got == want:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
