extends Node

## Prueba de logros e hitos del jugador (TASK-276):
##
##     godot --headless --quit-after 800 res://tests/achievements_test.tscn
##
## `Achievements` no necesita `main.tscn`: solo depende de `RaceRecords`
## (autoload) y de `UiTheme` (funciones estáticas), así que este arnés monta
## directo sobre el autoload real, igual que otros estados locales.

var _failures := 0
var _unlocked_calls: Array = []

## Claves de mentira, ajenas a cualquier circuito real — `RaceRecords.submit`
## no valida el formato, así que sirven para no tocar la marca de un
## circuito de verdad mientras se cruzan los umbrales.
const KEYS := [
	"ach-test-1", "ach-test-2", "ach-test-3", "ach-test-4", "ach-test-5",
	"ach-test-6", "ach-test-7", "ach-test-8", "ach-test-9", "ach-test-10",
]


func _ready() -> void:
	# `recorded_count()` cuenta TODAS las secciones de `user://records.cfg`,
	# y varios arneses ajenos (`track_integration_test`, `settings_test`...)
	# dejan la suya sin limpiar al terminar — sin este barrido, ese resto
	# compartido falsea el umbral de cada hito.
	_clear_all_records()
	Achievements.clear()

	Achievements.unlocked.connect(func(id: String, title: String) -> void:
		_unlocked_calls.append({"id": id, "title": title}))

	_test_sin_marcas_nada_desbloqueado()
	_test_primera_marca_desbloquea_el_primer_hito()
	_test_no_se_repite_al_batir_records_ya_contados()
	_test_a_las_cinco_desbloquea_el_segundo()
	_test_a_las_diez_desbloquea_el_tercero()
	_test_el_aviso_se_muestra_y_se_esconde_solo()

	_clear_all_records()
	Achievements.clear()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_sin_marcas_nada_desbloqueado() -> void:
	_check(Achievements.is_unlocked("primera_marca"), false, "sin ninguna marca, nada desbloqueado")


func _test_primera_marca_desbloquea_el_primer_hito() -> void:
	_unlocked_calls.clear()
	RaceRecords.submit(KEYS[0], 30000, [])

	_check(Achievements.is_unlocked("primera_marca"), true, "la primera marca desbloquea 'Primera marca'")
	_check(_unlocked_calls.size(), 1, "avisa una sola vez")
	if _unlocked_calls.size() > 0:
		_check(_unlocked_calls[0]["id"], "primera_marca", "con el id correcto")
		_check(_unlocked_calls[0]["title"], "Primera marca", "y el título correcto")


func _test_no_se_repite_al_batir_records_ya_contados() -> void:
	_unlocked_calls.clear()
	# Batir la MISMA marca (más rápido) no añade una sección nueva al
	# contador — sigue siendo 1 marca guardada, no una segunda.
	RaceRecords.submit(KEYS[0], 20000, [])

	_check(_unlocked_calls.size(), 0, "batir una marca ya contada no repite ni añade avisos")


func _test_a_las_cinco_desbloquea_el_segundo() -> void:
	_unlocked_calls.clear()
	RaceRecords.submit(KEYS[1], 30000, [])
	RaceRecords.submit(KEYS[2], 30000, [])
	RaceRecords.submit(KEYS[3], 30000, [])
	_check(_unlocked_calls.size(), 0, "con 4 marcas, todavía no llega al segundo hito")

	RaceRecords.submit(KEYS[4], 30000, [])
	_check(Achievements.is_unlocked("cinco_marcas"), true, "la 5ª marca desbloquea '5 marcas guardadas'")
	_check(_unlocked_calls.size(), 1, "solo avisa del hito nuevo, no repite el primero")
	if _unlocked_calls.size() > 0:
		_check(_unlocked_calls[0]["id"], "cinco_marcas", "con el id del segundo hito")


func _test_a_las_diez_desbloquea_el_tercero() -> void:
	_unlocked_calls.clear()
	for i in range(5, 9):
		RaceRecords.submit(KEYS[i], 30000, [])
	_check(_unlocked_calls.size(), 0, "con 9 marcas, todavía no llega al tercer hito")

	RaceRecords.submit(KEYS[9], 30000, [])
	_check(Achievements.is_unlocked("diez_marcas"), true, "la 10ª marca desbloquea '10 marcas guardadas'")
	_check(_unlocked_calls.size(), 1, "avisa solo del tercer hito")


func _test_el_aviso_se_muestra_y_se_esconde_solo() -> void:
	_clear_all_records()
	Achievements.clear()

	RaceRecords.submit(KEYS[0], 30000, [])

	_check(Achievements._toast.visible, true, "el aviso se muestra al desbloquear un hito")
	_check(Achievements._toast_label.text.find("Primera marca") != -1, true, "con el título del hito conseguido")

	Achievements._process(Achievements.TOAST_HOLD_S + 0.1)
	_check(Achievements._toast.visible, false, "y se esconde solo pasado el tiempo de espera")


# --- Utilidades ---------------------------------------------------------------

func _clear_all_records() -> void:
	for section in RaceRecords._cfg.get_sections():
		RaceRecords.clear(section)


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
