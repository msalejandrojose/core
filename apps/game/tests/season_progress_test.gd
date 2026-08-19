extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del aviso de cierre de temporada, lado cliente (TASK-228):
##
##     godot --headless --quit-after 800 res://tests/season_progress_test.tscn
##
## Mismo servidor falso (TCPServer + HTTP a mano) que `friends_screen_test.gd`
## y `online_race_test.gd`.

var _failures := 0

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

## Lo que sirve el servidor falso — se cambia entre pasos.
var _current_season_body := 'null'
var _your_position: Variant = null


func _ready() -> void:
	TestEnv.reset()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	await _test_primera_vez_solo_recuerda()
	await _test_misma_temporada_no_avisa()
	await _test_temporada_distinta_con_sesion_avisa_con_posicion()
	await _test_temporada_distinta_sin_posicion_avisa_igual()
	await _test_temporada_distinta_sin_sesion_no_avisa()
	await _test_cerrar_el_aviso_lo_libera()

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

		if _is_request_complete(entry["buffer"]):
			_reply(peer, entry["buffer"])
		else:
			still_pending.append(entry)
	_pending = still_pending


func _is_request_complete(text: String) -> bool:
	return text.find("\r\n\r\n") != -1


func _reply(peer: StreamPeerTCP, text: String) -> void:
	var request_line := text.split("\r\n")[0] if text.length() > 0 else ""

	var reply_body := "{}"
	if request_line.find("/seasons/current ") != -1:
		reply_body = _current_season_body
	elif request_line.find("/leaderboard") != -1:
		reply_body = JSON.stringify({
			"entries": [],
			"yourPosition": _your_position,
			"seasonId": "closed-season",
		})

	var body_bytes := reply_body.to_utf8_buffer()
	var header := (
		"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"
		% body_bytes.size())
	peer.put_data(header.to_utf8_buffer() + body_bytes)


# --- Casos --------------------------------------------------------------------

func _test_primera_vez_solo_recuerda() -> void:
	SeasonProgress.clear()
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	_current_season_body = '{"id":"season-1","name":"Temporada 1","startsAt":"2026-01-01T00:00:00.000Z","endsAt":null}'

	await SeasonProgress.check("kenney-01")

	_check(is_instance_valid(SeasonProgress._panel), false, "la primera vez, sin temporada anterior que contar, no hay aviso")


func _test_misma_temporada_no_avisa() -> void:
	await SeasonProgress.check("kenney-01")

	_check(is_instance_valid(SeasonProgress._panel), false, "sin cambio de temporada, no hay aviso")


func _test_temporada_distinta_con_sesion_avisa_con_posicion() -> void:
	_current_season_body = '{"id":"season-2","name":"Temporada 2","startsAt":"2026-02-01T00:00:00.000Z","endsAt":null}'
	_your_position = 5

	await SeasonProgress.check("kenney-01")

	_check(is_instance_valid(SeasonProgress._panel), true, "temporada distinta y con sesión: avisa")
	_check(SeasonProgress._message_label.text.find("puesto 5") != -1, true, "con la posición conseguida")

	SeasonProgress._close_panel()


func _test_temporada_distinta_sin_posicion_avisa_igual() -> void:
	_current_season_body = '{"id":"season-3","name":"Temporada 3","startsAt":"2026-03-01T00:00:00.000Z","endsAt":null}'
	_your_position = null

	await SeasonProgress.check("kenney-01")

	_check(is_instance_valid(SeasonProgress._panel), true, "sin posición (no llegó a correr), avisa igual de que hay temporada nueva")
	_check(SeasonProgress._message_label.text.find("no llegaste a marcar tiempo") != -1, true, "con el mensaje de sin marca")

	SeasonProgress._close_panel()


func _test_temporada_distinta_sin_sesion_no_avisa() -> void:
	Session.logout()
	_current_season_body = '{"id":"season-4","name":"Temporada 4","startsAt":"2026-04-01T00:00:00.000Z","endsAt":null}'

	await SeasonProgress.check("kenney-01")

	_check(is_instance_valid(SeasonProgress._panel), false, "sin sesión no hay con quién identificar la posición: no avisa")

	# Pero sigue recordando la temporada actual, para no recapitular esta
	# transición otra vez si el jugador entra más tarde.
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	_current_season_body = '{"id":"season-4","name":"Temporada 4","startsAt":"2026-04-01T00:00:00.000Z","endsAt":null}'
	await SeasonProgress.check("kenney-01")
	_check(is_instance_valid(SeasonProgress._panel), false, "misma temporada que la ya recordada: sigue sin avisar")


func _test_cerrar_el_aviso_lo_libera() -> void:
	_current_season_body = '{"id":"season-5","name":"Temporada 5","startsAt":"2026-05-01T00:00:00.000Z","endsAt":null}'
	_your_position = 1

	await SeasonProgress.check("kenney-01")
	_check(is_instance_valid(SeasonProgress._panel), true, "aparece el aviso")

	var button := _find_button(SeasonProgress._panel, "Vale")
	_check(button != null, true, "con botón para cerrarlo")
	button.pressed.emit()
	await get_tree().process_frame

	_check(is_instance_valid(SeasonProgress._panel), false, "y al cerrarlo, desaparece")


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


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
