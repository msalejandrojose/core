extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la pantalla de Clasificaciones (TASK-290, ya no una pestaña del
## menú — ver comentario en `main_menu.gd` sobre el rediseño de la pantalla
## principal):
##
##     godot --headless --quit-after 800 res://tests/leaderboard_screen_test.tscn
##
## Mismo servidor falso (TCPServer + HTTP a mano, solo GET) que
## `season_progress_test.gd`.

var _failures := 0

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

var _global_status := 200
var _global_body := '{"entries":[],"yourPosition":null,"seasonId":null}'
var _friends_status := 200
var _friends_body := '{"entries":[],"seasonId":null}'


func _ready() -> void:
	TestEnv.reset()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	await _test_sin_sesion_pide_cuenta()
	await _test_global_con_marcas()
	await _test_alternar_a_amigos()
	await _test_sin_marcas_de_amigos()
	await _test_error_de_red()
	await _test_cerrar_libera_la_pantalla()

	_server.stop()
	Session.logout()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _process(_delta: float) -> void:
	while _server.is_connection_available():
		_pending.append({"peer": _server.take_connection(), "buffer": ""})

	var still_pending: Array = []
	for entry in _pending:
		var peer: StreamPeerTCP = entry["peer"]
		if peer.get_available_bytes() > 0:
			entry["buffer"] += peer.get_data(peer.get_available_bytes())[1].get_string_from_utf8()

		if entry["buffer"].find("\r\n\r\n") != -1:
			_reply(peer, entry["buffer"])
		else:
			still_pending.append(entry)
	_pending = still_pending


func _reply(peer: StreamPeerTCP, text: String) -> void:
	var request_line := text.split("\r\n")[0] if text.length() > 0 else ""

	var status := 200
	var reply_body := "{}"
	if request_line.find("/leaderboard/friends") != -1:
		status = _friends_status
		reply_body = _friends_body
	elif request_line.find("/leaderboard") != -1:
		status = _global_status
		reply_body = _global_body

	var body_bytes := reply_body.to_utf8_buffer()
	var header := (
		"HTTP/1.1 %d OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"
		% [status, body_bytes.size()])
	peer.put_data(header.to_utf8_buffer() + body_bytes)


# --- Casos --------------------------------------------------------------------

func _open_screen() -> CanvasLayer:
	var screen: CanvasLayer = load("res://scenes/ui/leaderboard-screen.tscn").instantiate()
	add_child(screen)
	await _settle()
	return screen


func _test_sin_sesion_pide_cuenta() -> void:
	Session.logout()
	var screen := await _open_screen()

	_check(screen._status.text.find("Necesitas una cuenta") != -1, true,
		"sin sesión, pide cuenta en vez de listar")
	_check(screen._container.get_child_count(), 0, "y no hay filas")

	screen.close_screen()


func _test_global_con_marcas() -> void:
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	_global_body = JSON.stringify({
		"entries": [
			{"position": 1, "userId": "u1", "displayName": "Ana", "durationMs": 38420, "achievedAt": "2026-01-01T00:00:00.000Z"},
			{"position": 2, "userId": "u2", "displayName": "Bea", "durationMs": 40000, "achievedAt": "2026-01-01T00:00:00.000Z"},
		],
		"yourPosition": 2,
		"seasonId": null,
	})

	var screen := await _open_screen()

	_check(screen._container.get_child_count(), 2, "carga las dos filas del ranking global")
	_check(_find_label_containing(screen._container, "Ana") != null, true, "con el nombre del primero")

	screen.close_screen()


func _test_alternar_a_amigos() -> void:
	_friends_body = JSON.stringify({
		"entries": [
			{"position": 1, "userId": "me", "displayName": "Yo", "durationMs": 39000, "achievedAt": "2026-01-01T00:00:00.000Z"},
		],
		"seasonId": null,
	})

	var screen := await _open_screen()
	var friends_button := _find_button(screen, "Solo amigos")
	_check(friends_button != null, true, "hay botón para alternar a solo amigos")

	friends_button.pressed.emit()
	await _settle()

	_check(screen._container.get_child_count(), 1, "carga el ranking de amigos, distinto del global")
	_check(_find_label_containing(screen._container, "Yo") != null, true, "con el propio jugador dentro")

	screen.close_screen()


func _test_sin_marcas_de_amigos() -> void:
	_friends_body = '{"entries":[],"seasonId":null}'

	var screen := await _open_screen()
	_find_button(screen, "Solo amigos").pressed.emit()
	await _settle()

	_check(screen._container.get_child_count(), 0, "sin marcas de amigos, no hay filas")
	_check(screen._status.text.find("Ninguno de tus amigos") != -1, true, "y lo dice claramente")

	screen.close_screen()


func _test_error_de_red() -> void:
	_global_status = 500
	_global_body = '{"code":"INTERNAL","message":"error"}'

	var screen := await _open_screen()

	_check(screen._status.text.find("No se pudo cargar") != -1, true, "si falla la petición, lo dice")

	screen.close_screen()
	_global_status = 200


func _test_cerrar_libera_la_pantalla() -> void:
	var screen := await _open_screen()
	var close_button := _find_button(screen, "Cerrar")
	_check(close_button != null, true, "hay botón para cerrar")

	close_button.pressed.emit()
	await _settle()

	_check(is_instance_valid(screen), false, "y cerrar libera la pantalla")


# --- Utilidades ---------------------------------------------------------------

func _settle() -> void:
	for i in 60:
		await get_tree().process_frame


func _find_button(root: Node, text: String) -> Button:
	if root is Button and root.text == text:
		return root
	for child in root.get_children():
		var found := _find_button(child, text)
		if found != null:
			return found
	return null


func _find_label_containing(root: Node, text: String) -> Label:
	if root is Label and root.text.find(text) != -1:
		return root
	for child in root.get_children():
		var found := _find_label_containing(child, text)
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
