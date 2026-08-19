extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del menú de pausa (TASK-259):
##
##     godot --headless --quit-after 800 res://tests/pause_menu_test.tscn
##
## Cubre lo que antes NO pasaba con los tres botones sueltos: que abrir el
## menú deja la carrera de verdad congelada (mando y crono), y que cada
## acción devuelve el mando y el proceso a donde toca.
##
## `queue_free()` es diferido: cada caso que cierra el menú espera un frame
## antes de comprobar que ya no está, si no la instancia vieja sigue viva
## (y `_find_pause_menu()` la encontraría) hasta que el motor procese el
## borrado pendiente.

var _failures := 0
var _now: int = 0

var _director: RaceDirector
var _timer: LapTimer
## `race_hud.gd` (Control, con el script) vive DENTRO del `CanvasLayer`
## "RaceHud" — es donde `_open_pause_menu()` hace `add_child(menu)`, así que
## es donde hay que buscar el menú y sus botones.
var _hud: Control
## El `CanvasLayer` en sí: es a quien `RaceDirector.open_menu()` esconde
## (`race_hud.visible = false`), no al `Control` de dentro.
var _hud_layer: CanvasLayer
var _main_menu: CanvasLayer


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	_director = main.get_node("RaceDirector")
	_timer = main.get_node("LapTimer")
	_hud_layer = main.get_node("RaceHud")
	_hud = main.get_node("RaceHud/Hud")
	_main_menu = main.get_node("MainMenu")

	_director.set_process(false)
	VehicleInput.locked = false
	_timer.auto_start_on_throttle = false
	_timer.clock = func() -> int: return _now
	_timer.start()

	await _test_abrir_congela_mando_y_crono()
	await _test_elapsed_no_avanza_pausado()
	await _test_reanudar_devuelve_todo_a_su_sitio()
	await _test_ajustes_abre_por_encima_sin_cerrar_la_pausa()
	await _test_reiniciar_cierra_el_menu_y_reinicia()
	await _test_menu_principal_cierra_la_carrera()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _open_menu() -> PauseMenu:
	var pause_button := _find_button(_hud, "⏸")
	pause_button.pressed.emit()
	return _find_pause_menu()


func _find_pause_menu() -> PauseMenu:
	for child in _hud.get_children():
		if child is PauseMenu:
			return child
	return null


## Cierra lo que haya abierto (`action`) y espera a que el `queue_free()`
## diferido se procese de verdad, para que el siguiente caso no se
## encuentre una instancia zombi todavía en el árbol.
func _close_and_settle(action: Callable) -> void:
	action.call()
	await get_tree().process_frame


# --- Casos --------------------------------------------------------------------

func _test_abrir_congela_mando_y_crono() -> void:
	_now = 1000
	var menu := _open_menu()

	_check(menu != null, true, "el botón de pausa abre el menú")
	_check(VehicleInput.locked, true, "abrir la pausa bloquea el mando")
	_check(_director.is_processing(), false, "y congela el proceso del director")
	_check(_timer._paused, true, "y congela el crono")

	await _close_and_settle(menu._resume)


func _test_elapsed_no_avanza_pausado() -> void:
	_now = 5000
	_timer._process(0.0)
	_check_eq(_timer.elapsed_ms, 5000, "sin pausa, el crono avanza")

	var menu := _open_menu()
	_now = 9000
	_timer._process(0.0)
	_check_eq(_timer.elapsed_ms, 5000, "con la pausa abierta, el crono no avanza aunque pase tiempo")

	await _close_and_settle(menu._resume)
	_timer._process(0.0)
	_check_eq(_timer.elapsed_ms, 5000, "al reanudar, el tiempo pasado en pausa no se cuenta")


func _test_reanudar_devuelve_todo_a_su_sitio() -> void:
	var menu := _open_menu()
	await _close_and_settle(menu._resume)

	_check(VehicleInput.locked, false, "reanudar desbloquea el mando")
	_check(_director.is_processing(), true, "y reactiva el proceso del director")
	_check(_timer._paused, false, "y reanuda el crono")
	_check(_find_pause_menu(), null, "y cierra el menú")


func _test_ajustes_abre_por_encima_sin_cerrar_la_pausa() -> void:
	var menu := _open_menu()
	var settings_button := _find_button(menu, "Ajustes")
	_check(settings_button != null, true, "hay botón de ajustes en la pausa")

	settings_button.pressed.emit()
	await get_tree().process_frame

	_check(_find_pause_menu() != null, true, "abrir ajustes no cierra la pausa de detrás")
	_check(VehicleInput.locked, true, "la carrera sigue congelada mientras ajustes está abierto")

	# Cierra ajustes y la pausa para dejar el estado limpio para el resto.
	for child in menu.get_children():
		if child is CanvasLayer and child != menu:
			child.queue_free()
	await _close_and_settle(menu._resume)


func _test_reiniciar_cierra_el_menu_y_reinicia() -> void:
	_timer.start()
	_now += 3000
	var menu := _open_menu()

	await _close_and_settle(menu._restart)

	_check(_find_pause_menu(), null, "reiniciar cierra el menú de pausa")
	_check(_director.counting_down, true, "y rearma el semáforo")
	_check(_director.is_processing(), true, "con el proceso reactivado para que la cuenta atrás avance")

	_director.set_process(false)


func _test_menu_principal_cierra_la_carrera() -> void:
	_timer.start()
	var menu := _open_menu()

	await _close_and_settle(menu._open_main_menu)

	_check(_find_pause_menu(), null, "volver al menú cierra la pausa")
	_check(_main_menu.visible, true, "y muestra el menú principal")
	_check(_hud_layer.visible, false, "y esconde el HUD de carrera")


# --- Utilidades ---------------------------------------------------------------

func _find_button(root: Node, text: String) -> Button:
	if root is Button and root.text == text:
		return root
	for child in root.get_children():
		var found := _find_button(child, text)
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
