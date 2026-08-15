extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la pantalla de amigos (TASK-258):
##
##     godot --headless --quit-after 800 res://tests/friends_screen_test.tscn
##
## Servidor falso de verdad (TCPServer + HTTP a mano, no bloqueante — mismo
## motivo y mismo diseño que `online_race_test.gd`: `OS.delay_msec` congela
## el bucle del motor que el propio `HTTPRequest` del cliente necesita para
## avanzar, así que se acumula frame a frame en vez de esperar bloqueado.

var _failures := 0

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

## Estado que sirve el servidor falso — el test lo cambia entre pasos para
## simular lo que devolvería la API real en cada momento.
var _requests_payload: Array = []
var _friends_payload: Array = []
var _add_friend_status := 201
var _add_friend_body := '{"id":"friendship-1","requesterId":"me","addresseeId":"other","status":"PENDING","createdAt":"2026-01-01T00:00:00.000Z","respondedAt":null}'
var _last_add_friend_body := ""


func _ready() -> void:
	TestEnv.reset()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	await _test_sin_cuenta_muestra_mensaje()
	await _test_carga_codigo_propio()
	await _test_sin_solicitudes_ni_amigos()
	await _test_solicitud_pendiente_y_aceptarla()
	await _test_anadir_amigo()
	await _test_anadir_amigo_rechazado()

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
	var sep := text.find("\r\n\r\n")
	if sep == -1:
		return false

	var content_length := 0
	for line in text.substr(0, sep).split("\r\n"):
		if line.to_lower().begins_with("content-length:"):
			content_length = int(line.split(":")[1].strip_edges())

	return text.substr(sep + 4).length() >= content_length


func _reply(peer: StreamPeerTCP, text: String) -> void:
	var request_line := text.split("\r\n")[0] if text.length() > 0 else ""
	var sep := text.find("\r\n\r\n")
	var body := text.substr(sep + 4) if sep != -1 else ""

	var status := 200
	var reply_body := "{}"

	if request_line.begins_with("GET") and request_line.find("/friends/me/code ") != -1:
		reply_body = '{"code":"TESTCODE"}'
	elif request_line.begins_with("GET") and request_line.find("/friends/requests ") != -1:
		reply_body = JSON.stringify(_requests_payload)
	elif request_line.begins_with("GET") and request_line.find("/friends ") != -1:
		reply_body = JSON.stringify(_friends_payload)
	elif request_line.begins_with("POST") and request_line.find("/accept ") != -1:
		reply_body = '{"id":"req-1","requesterId":"other","addresseeId":"me","status":"ACCEPTED","createdAt":"2026-01-01T00:00:00.000Z","respondedAt":"2026-01-01T00:00:01.000Z"}'
	elif request_line.begins_with("POST") and request_line.find("/reject ") != -1:
		reply_body = '{"id":"req-1","requesterId":"other","addresseeId":"me","status":"REJECTED","createdAt":"2026-01-01T00:00:00.000Z","respondedAt":"2026-01-01T00:00:01.000Z"}'
	elif request_line.begins_with("POST") and request_line.find("/friends ") != -1:
		_last_add_friend_body = body
		status = _add_friend_status
		reply_body = _add_friend_body if status == 201 else '{"code":"RACING_FRIEND_CODE_NOT_FOUND","message":"Ningún jugador tiene ese código."}'

	# `.length()` cuenta caracteres, no bytes — con acentos/ñ el body pesa más
	# bytes de los que tiene caracteres, y un Content-Length corto deja al
	# cliente leyendo un JSON truncado ("Unterminated string").
	var body_bytes := reply_body.to_utf8_buffer()
	var header := (
		"HTTP/1.1 %d OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"
		% [status, body_bytes.size()])
	peer.put_data(header.to_utf8_buffer() + body_bytes)


# --- Casos --------------------------------------------------------------------

func _test_sin_cuenta_muestra_mensaje() -> void:
	Session.access_token = ""
	var screen: CanvasLayer = load("res://scenes/ui/friends-screen.tscn").instantiate()
	add_child(screen)
	await get_tree().process_frame

	_check(screen._status.text.find("Necesitas una cuenta") != -1, true,
		"sin cuenta muestra un mensaje")
	_check(_find_button(screen, "Cerrar") != null, true, "y hay botón para cerrar")

	screen.close_screen()
	Session.access_token = "token-de-prueba"


func _test_carga_codigo_propio() -> void:
	var screen := await _open_screen()
	_check(screen._code_label.text, "TESTCODE", "carga y muestra el código propio")
	screen.close_screen()


func _test_sin_solicitudes_ni_amigos() -> void:
	_requests_payload = []
	_friends_payload = []
	var screen := await _open_screen()

	_check(_find_label_containing(screen._requests_container, "No tienes solicitudes") != null,
		true, "sin solicitudes, lo dice claramente")
	_check(_find_label_containing(screen._friends_container, "Aún no tienes amigos") != null,
		true, "sin amigos, lo dice claramente")

	screen.close_screen()


func _test_solicitud_pendiente_y_aceptarla() -> void:
	_requests_payload = [{
		"id": "req-1", "requesterId": "other", "requesterDisplayName": "Ana",
		"createdAt": "2026-01-01T00:00:00.000Z",
	}]
	_friends_payload = []
	var screen := await _open_screen()

	_check(_find_label_containing(screen._requests_container, "Ana") != null, true,
		"la solicitud pendiente aparece con el nombre de quien la mandó")

	var accept_button := _find_button(screen._requests_container, "Aceptar")
	_check(accept_button != null, true, "hay botón para aceptar")

	# Tras aceptar, el servidor falso ya devolvería a Ana en la lista de
	# amigos — se simula actualizando el estado que sirve el servidor antes
	# de que la pantalla vuelva a pedirla.
	_requests_payload = []
	_friends_payload = [{"userId": "other", "displayName": "Ana", "friendsSince": "2026-01-01T00:00:01.000Z"}]

	accept_button.pressed.emit()
	await _settle()

	_check(_find_label_containing(screen._requests_container, "No tienes solicitudes") != null,
		true, "tras aceptar, ya no queda como pendiente")
	_check(_find_label_containing(screen._friends_container, "Ana") != null, true,
		"y Ana aparece en la lista de amigos")

	screen.close_screen()


func _test_anadir_amigo() -> void:
	_requests_payload = []
	_friends_payload = []
	_add_friend_status = 201
	var screen := await _open_screen()

	screen._add_field.text = "  otrocodigo  "
	var add_button := _find_button(screen, "Añadir")
	add_button.pressed.emit()
	await _settle()

	_check(_last_add_friend_body.find("otrocodigo") != -1, true,
		"el código se manda tal cual se escribió")
	_check(screen._add_status.text, "Solicitud enviada.", "confirma el envío")
	_check(screen._add_field.text, "", "y limpia el campo")

	screen.close_screen()


func _test_anadir_amigo_rechazado() -> void:
	_add_friend_status = 404
	var screen := await _open_screen()

	screen._add_field.text = "NOEXISTE"
	var add_button := _find_button(screen, "Añadir")
	add_button.pressed.emit()
	await _settle()

	_check(screen._add_status.text.find("Ningún jugador") != -1, true,
		"muestra el motivo del rechazo del servidor")

	screen.close_screen()
	_add_friend_status = 201


# --- Utilidades ---------------------------------------------------------------

func _open_screen() -> Node:
	var screen: CanvasLayer = load("res://scenes/ui/friends-screen.tscn").instantiate()
	add_child(screen)
	await _settle()
	return screen


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
