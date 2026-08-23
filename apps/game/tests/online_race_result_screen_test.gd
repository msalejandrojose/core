extends Node

## Prueba de `OnlineRaceResultScreen` (TASK-287): construye la escena
## directamente con un `response_data` fabricado a mano, sin red ni
## `RaceDirector` real de por medio — lo que hace falta probar es que
## renderiza bien el podio, el récord personal y el desglose de monedas a
## partir de la forma exacta que devuelve `POST .../online-races`. El botón
## "Revancha" solo se comprueba en su existencia/conexión aquí; el viaje de
## red completo ya lo cubre `online_race_test.gd`.
##
##     godot --quit-after 300 res://tests/online_race_result_screen_test.tscn

var _failures := 0

const RESPONSE := {
	"id": "race-1",
	"trackId": "track-1",
	"createdAt": "2026-01-01T00:00:00.000Z",
	"participants": [
		{"role": "THREAT", "userId": "threat-1", "durationMs": 41000, "position": 1, "deltaMs": 0},
		{"role": "PLAYER", "userId": "player-1", "durationMs": 42500, "position": 2, "deltaMs": 1500},
		{"role": "TARGET", "userId": "target-1", "durationMs": 43000, "position": 3, "deltaMs": 2000},
	],
	"coinsEarned": [
		{"amount": 60, "source": "RACE_SECOND_PLACE"},
		{"amount": 60, "source": "BEAT_FRIEND"},
	],
}


func _ready() -> void:
	_test_podio_completo()
	_test_nuevo_record()
	_test_bate_marca_personal_aunque_no_gane()
	_test_desglose_de_monedas_con_total()
	_test_una_sola_moneda_sin_total()
	_test_sin_monedas_no_hay_desglose()
	_test_botones_menu_y_revancha()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_podio_completo() -> void:
	var screen := _open_screen(RESPONSE, null, false)
	var texts := _collect_texts(screen)

	_check(_contains(texts, "Tú"), true, "el jugador se etiqueta como 'Tú'")
	_check(_contains(texts, "Rival"), true, "los rivales se etiquetan como 'Rival'")
	_check(_count(texts, "Rival"), 2, "dos rivales, dos filas 'Rival'")
	_check(_contains(texts, "#1"), true, "aparece la posición 1")
	_check(_contains(texts, "#2"), true, "aparece la posición 2 (el jugador)")
	_check(_contains(texts, "#3"), true, "aparece la posición 3")

	screen.queue_free()


func _test_nuevo_record() -> void:
	var screen := _open_screen(RESPONSE, 45000, true)
	var texts := _collect_texts(screen)
	_check(_contains(texts, "¡Nuevo récord personal!"), true,
		"con is_new_record, se celebra aunque no haya ganado el podio (2º puesto en RESPONSE)")
	screen.queue_free()


func _test_bate_marca_personal_aunque_no_gane() -> void:
	# El jugador de RESPONSE hace 42500ms y queda 2º — pero si su marca
	# anterior era 44000ms, ha mejorado su propio tiempo igualmente: eso se
	# calcula contra `previous_best_ms`, NO contra el resto del podio
	# (criterio de done explícito de TASK-287).
	var screen := _open_screen(RESPONSE, 44000, false)
	var texts := _collect_texts(screen)
	_check(_contains(texts, "-1.500 respecto a tu mejor marca"), true,
		"mejora su marca personal en 1.5s, aunque haya quedado 2º")
	screen.queue_free()


func _test_desglose_de_monedas_con_total() -> void:
	var screen := _open_screen(RESPONSE, null, false)
	var texts := _collect_texts(screen)
	_check(_contains(texts, "+60 — 2º puesto"), true, "aparece el bono de posición")
	_check(_contains(texts, "+60 — Ganaste a un amigo"), true, "y el bono social, los dos a la vez")
	_check(_contains(texts, "Total: +120 monedas"), true, "con el total sumado cuando hay más de uno")
	screen.queue_free()


func _test_una_sola_moneda_sin_total() -> void:
	var response := RESPONSE.duplicate(true)
	response["coinsEarned"] = [{"amount": 100, "source": "RACE_FIRST_PLACE"}]
	var screen := _open_screen(response, null, false)
	var texts := _collect_texts(screen)
	_check(_contains(texts, "+100 — 1er puesto"), true, "se ve el único bono")
	_check(_contains(texts, "Total:"), false,
		"con un solo bono, repetir el total debajo no aporta nada")
	screen.queue_free()


func _test_sin_monedas_no_hay_desglose() -> void:
	var response := RESPONSE.duplicate(true)
	response["coinsEarned"] = []
	var screen := _open_screen(response, null, false)
	var texts := _collect_texts(screen)
	_check(_contains(texts, "Total:"), false, "sin coinsEarned, no se fuerza ningún desglose")
	screen.queue_free()


func _test_botones_menu_y_revancha() -> void:
	var screen := _open_screen(RESPONSE, null, false)
	var menu_button := _find_button(screen, "Menú")
	var rematch_button := _find_button(screen, "Revancha")
	_check(menu_button != null, true, "hay un botón para volver al menú")
	_check(rematch_button != null, true, "y otro para la revancha inmediata")
	if rematch_button != null:
		_check(rematch_button.pressed.get_connections().size() > 0, true,
			"el botón de revancha está conectado a algo")
	screen.queue_free()


# --- Utilidades ---------------------------------------------------------------

func _open_screen(response_data: Dictionary, previous_best_ms, is_new_record: bool) -> CanvasLayer:
	var screen: CanvasLayer = load("res://scenes/ui/online-race-result-screen.tscn").instantiate()
	add_child(screen)
	screen.show_result(response_data, previous_best_ms, is_new_record)
	return screen


func _collect_texts(root: Node) -> Array:
	var texts: Array = []
	if root is Label:
		texts.append((root as Label).text)
	for child in root.get_children():
		texts.append_array(_collect_texts(child))
	return texts


func _contains(texts: Array, needle: String) -> bool:
	for text in texts:
		if str(text).find(needle) != -1:
			return true
	return false


func _count(texts: Array, needle: String) -> int:
	var total := 0
	for text in texts:
		if str(text) == needle:
			total += 1
	return total


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


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
