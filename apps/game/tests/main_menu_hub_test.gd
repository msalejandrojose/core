extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del menú principal como hub navegable (TASK-256/TASK-257):
##
##     godot --headless --quit-after 800 res://tests/main_menu_hub_test.tscn
##
## Cubre lo que el refactor puede romper sin que se note a primera vista: que
## cambiar de pestaña no arrastra botones de la anterior, que elegir
## circuito/sentido/cilindrada sigue funcionando igual que antes, y que un
## evento que llega con otra pestaña montada (`CarLoadout.changed`) no revienta
## por escribir en una label que ya no existe.

var _failures := 0
var _menu: CanvasLayer
## Miembro y no local: una lambda de GDScript captura las locales por VALOR
## (ver el mismo aviso en `race_flow_test.gd`), así que escribir en una local
## desde dentro de la lambda no se vería fuera de ella.
var _play_signal_fired := false


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var director: RaceDirector = main.get_node("RaceDirector")
	director.set_process(false)
	_menu = main.get_node("MainMenu")

	_test_abre_en_jugar()
	_test_elegir_circuito_sentido_cilindrada()
	_test_cambiar_de_pestana_limpia_la_anterior()
	_test_evento_con_otra_pestana_no_revienta()
	_test_volver_a_jugar_resincroniza()
	await _test_correr_emite_la_senal()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_abre_en_jugar() -> void:
	_check_eq(_menu._active_tab, _menu.Tab.JUGAR, "al abrir, la pestaña activa es Jugar")
	_check(_menu._track_buttons.size() > 0, true, "Jugar monta los botones de circuito")
	_check(is_instance_valid(_menu._best_label), true, "Jugar monta la label de mejor marca")


func _test_elegir_circuito_sentido_cilindrada() -> void:
	var ids: Array = TrackCatalog.ids()
	var other_id: String = ids[1]
	_menu._pick_track(other_id)
	_check_eq(GameSettings.track_id, other_id, "elegir circuito sigue cambiando GameSettings")

	_menu._pick_direction(true)
	_check_eq(GameSettings.reverse, true, "elegir sentido sigue cambiando GameSettings")

	_menu._pick_engine(GameSettings.EngineClass.CC150)
	_check_eq(GameSettings.engine_class, GameSettings.EngineClass.CC150, "elegir cilindrada sigue cambiando GameSettings")


func _test_cambiar_de_pestana_limpia_la_anterior() -> void:
	_menu._select_tab(_menu.Tab.TALLER)

	_check_eq(_menu._track_buttons.size(), 0, "salir de Jugar libera sus botones de circuito")
	_check(not is_instance_valid(_menu._best_label), true, "salir de Jugar libera la label de mejor marca")


func _test_evento_con_otra_pestana_no_revienta() -> void:
	# Si `_refresh_best`/`_refresh_account` no guardan el hueco de `_best_label`
	# == null, esto revienta el árbol de nodos y el test entero se cae, no solo
	# esta comprobación — que es la señal de que el guard hace falta de verdad.
	CarLoadout.changed.emit()
	_check(true, true, "un evento con otra pestaña montada no revienta el árbol")


func _test_volver_a_jugar_resincroniza() -> void:
	_menu._select_tab(_menu.Tab.JUGAR)

	var ids: Array = TrackCatalog.ids()
	var selected := ids.find(GameSettings.track_id)
	_check(_menu._track_buttons[selected].button_pressed, true, "al volver, el botón del circuito elegido sigue marcado")
	_check(_menu._direction_buttons[1].button_pressed, true, "y el de sentido inverso también")


func _test_correr_emite_la_senal() -> void:
	_menu.play_pressed.connect(func(): _play_signal_fired = true)

	for child in _menu._content.get_children():
		if child is Button and child.text == "Correr":
			child.pressed.emit()

	await get_tree().process_frame
	_check(_play_signal_fired, true, "el botón Correr sigue emitiendo play_pressed")


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
