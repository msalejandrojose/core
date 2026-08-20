extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del menú principal (segunda captura de referencia, ver comentario
## en `main_menu.gd`):
##
##     godot --headless --quit-after 800 res://tests/main_menu_hub_test.tscn
##
## Ya no hay pestañas con contenido propio — "modo" solo decide qué hace
## "Empezar Carrera", circuito/cilindrada están siempre visibles. Cubre que
## elegir circuito/cilindrada/modo sigue tocando `GameSettings`, que
## "Sentido" ha desaparecido de verdad, y que cada modo dispara lo que
## tiene que disparar.

var _failures := 0
var _menu: CanvasLayer
var _director: RaceDirector
## Miembro y no local: una lambda de GDScript captura las locales por VALOR
## (ver el mismo aviso en `race_flow_test.gd`), así que escribir en una local
## desde dentro de la lambda no se vería fuera de ella.
var _play_signal_fired := false
var _time_trial_signal_fired := false


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	_director = main.get_node("RaceDirector")
	_director.set_process(false)
	_menu = main.get_node("MainMenu")

	_test_abre_con_carrera_rapida()
	_test_elegir_circuito_desde_la_rejilla()
	_test_elegir_cilindrada()
	_test_sin_control_de_sentido()
	_test_cabecera_siempre_visible()
	_test_boton_taller_abre_el_taller()
	await _test_correr_en_carrera_rapida()
	_test_cambiar_a_grand_prix_esconde_multijugador()
	await _test_time_trial_emite_su_senal()
	_test_grand_prix_abre_su_pantalla()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_abre_con_carrera_rapida() -> void:
	_check_eq(_menu._active_mode, _menu.Mode.CARRERA_RAPIDA, "al abrir, el modo activo es Carrera Rápida")
	_check(is_instance_valid(_menu._track_summary_label) and _menu._track_summary_label.text != "",
		true, "muestra el resumen del circuito elegido")
	_check(is_instance_valid(_menu._best_label), true, "monta la label de mejor marca")
	# Ya no hay columna central con visor propio (`_preview` no existe): el
	# coche equipado en vivo es el mismo `Vehicle` del garaje de fondo, así
	# que lo que hay que comprobar es que ese garaje está a la vista y el
	# coche tiene modelo montado — ver `race_director._set_garage_visible()`.
	_check(_director.menu_garage.visible, true, "el garaje está de fondo en el menú")
	_check(_director.vehicle.vehicle_model.get_node_or_null("Model") != null, true,
		"el coche equipado en vivo tiene modelo montado")
	_check(_menu._account_subtitle.text != "", true, "la cabecera muestra el estado de cuenta")
	_check(_menu._online_button.visible, true, "en Carrera Rápida, Multijugador Online está visible")


func _test_elegir_circuito_desde_la_rejilla() -> void:
	var ids: Array = TrackCatalog.ids()
	var other_id: String = ids[1]

	_menu._pick_track(other_id)

	_check_eq(GameSettings.track_id, other_id, "tocar una tarjeta de circuito cambia GameSettings")
	_check_eq(_menu._track_summary_label.text, TrackCatalog.by_id(other_id).name,
		"y el resumen refleja el circuito elegido")

	var index: int = _menu._track_card_ids.find(other_id)
	_check(index != -1, true, "la tarjeta elegida está entre las montadas")


func _test_elegir_cilindrada() -> void:
	_menu._pick_engine(GameSettings.EngineClass.CC150)
	_check_eq(GameSettings.engine_class, GameSettings.EngineClass.CC150, "elegir cilindrada sigue cambiando GameSettings")

	# `_pick_engine` no toca el botón por sí solo (eso lo hace Godot al
	# pulsarlo de verdad, vía `ButtonGroup`) — `_sync()` es quien lo
	# refleja, mismo motivo que `_sync_jugar()` en el diseño anterior.
	_menu._sync()
	_check(_menu._engine_buttons[GameSettings.EngineClass.CC150].button_pressed, true,
		"y el botón correspondiente queda marcado")


## TASK: quitar "Sentido" del menú principal — sin sustituto en ningún otro
## sitio por ahora, a propósito (ver comentario en `main_menu.gd`).
func _test_sin_control_de_sentido() -> void:
	_check(_find_button(_menu, "Inverso") == null, true, "no queda ningún control de sentido en el menú")
	_check(_find_button(_menu, "Normal") == null, true, "tampoco el botón \"Normal\"")


func _test_cabecera_siempre_visible() -> void:
	for text in ["⚙ Ajustes", "👥 Amigos", "🏆 Clasificaciones"]:
		_check(_find_button(_menu, text) != null, true, "la cabecera tiene un acceso a \"%s\"" % text)

	# El botón de cuenta alterna Entrar/Salir según la sesión — sin cuenta
	# (el estado por defecto de `TestEnv.reset()`) el texto es "Entrar".
	_check(is_instance_valid(_menu._account_button), true, "y un botón de cuenta")
	_check(_menu._account_button.text, "🚪 Entrar", "que sin sesión dice \"Entrar\"")


func _test_boton_taller_abre_el_taller() -> void:
	var before := _menu.get_child_count()
	var button := _find_button(_menu, "🔧 Ir al taller")
	_check(button != null, true, "hay botón para ir al taller junto al coche")

	button.pressed.emit()
	_check(_menu.get_child_count() > before, true, "y abre la pantalla del taller")

	for child in _menu.get_children():
		if child is CanvasLayer and child.name == "WorkshopScreen":
			child.queue_free()


func _test_correr_en_carrera_rapida() -> void:
	_menu._pick_mode(_menu.Mode.CARRERA_RAPIDA)
	_menu.play_pressed.connect(func(): _play_signal_fired = true)

	_menu._start_button.pressed.emit()
	await get_tree().process_frame

	_check(_play_signal_fired, true, "\"Empezar Carrera\" en Carrera Rápida emite play_pressed")


func _test_cambiar_a_grand_prix_esconde_multijugador() -> void:
	_menu._pick_mode(_menu.Mode.GRAND_PRIX)
	_check(_menu._online_button.visible, false, "en Grand Prix, Multijugador Online se esconde")

	_menu._pick_mode(_menu.Mode.CARRERA_RAPIDA)
	_check(_menu._online_button.visible, true, "y vuelve a aparecer al volver a Carrera Rápida")


func _test_time_trial_emite_su_senal() -> void:
	_menu._pick_mode(_menu.Mode.TIME_TRIAL)
	_menu.time_trial_pressed.connect(func(): _time_trial_signal_fired = true)

	_menu._start_button.pressed.emit()
	await get_tree().process_frame

	_check(_time_trial_signal_fired, true, "\"Empezar Carrera\" en Time Trial emite time_trial_pressed")

	_menu._pick_mode(_menu.Mode.CARRERA_RAPIDA)


func _test_grand_prix_abre_su_pantalla() -> void:
	_menu._pick_mode(_menu.Mode.GRAND_PRIX)
	var before := _menu.get_child_count()

	_menu._start_button.pressed.emit()

	_check(_menu.get_child_count() > before, true, "\"Empezar Carrera\" en Grand Prix abre su pantalla")

	for child in _menu.get_children():
		if child is CanvasLayer and child.name == "GrandPrixScreen":
			child.queue_free()
	_menu._pick_mode(_menu.Mode.CARRERA_RAPIDA)


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
