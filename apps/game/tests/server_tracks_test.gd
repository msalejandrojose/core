extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de los circuitos del servidor en la pestaña Jugar (TASK "listar en
## Jugar todos los circuitos del servidor"):
##
##     godot --headless --quit-after 800 res://tests/server_tracks_test.tscn
##
## Servidor falso de verdad (TCPServer + HTTP a mano, no bloqueante — mismo
## motivo y diseño que `online_race_test.gd`).

var _failures := 0

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

## `kenney-01-50cc-normal` es una variante de uno de los 4 del catálogo local
## (empieza por "kenney-01-") — tiene que quedar filtrada. `circuito-del-
## puerto` es un circuito de verdad nacido en el backoffice — tiene que
## aparecer.
## La clave del array es "data" — el mismo nombre, confusamente, que
## `ApiResponse.data` (el body entero ya parseado). La primera versión de
## este test usaba "items" a juego con un bug real en `main_menu.gd` que
## leía la misma clave equivocada — pasaba igual porque los dos lados
## mentían del mismo modo. Aquí va la forma real de
## `CursorPaginatedResponseDto` (`apps/api/.../cursor-paginated-response.dto.ts`).
var _tracks_payload := {
	"data": [
		{"slug": "kenney-01-50cc-normal", "name": "Kenney 50cc", "sectorCount": 4},
		{"slug": "circuito-del-puerto", "name": "Circuito del Puerto", "sectorCount": 3},
	],
	"nextCursor": null,
}


func _ready() -> void:
	TestEnv.reset()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	_test_key_for_sigue_componiendo_para_ids_de_prueba()
	await _test_lista_circuitos_del_servidor_sin_duplicar_los_locales()
	await _test_elegir_circuito_de_servidor_marca_track_is_server()

	_server.stop()
	Session.logout()
	GameSettings.set_track_id(TrackCatalog.DEFAULT_ID, false)

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
	var body := "{}"
	if request_line.begins_with("GET") and request_line.find("/racing/tracks") != -1:
		body = JSON.stringify(_tracks_payload)

	var body_bytes := body.to_utf8_buffer()
	var header := (
		"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"
		% body_bytes.size())
	peer.put_data(header.to_utf8_buffer() + body_bytes)


# --- Casos --------------------------------------------------------------------

func _test_key_for_sigue_componiendo_para_ids_de_prueba() -> void:
	# `key_for` compone SIEMPRE, lo pida quien lo pida — es `track_key()` (con
	# el `track_id` real y `track_is_server`) quien decide si componer o no.
	# `track_id_override` de los arneses de test pasa por `key_for` a pelo.
	GameSettings.reverse = false
	var key := GameSettings.key_for("un-id-cualquiera")
	_check(key.begins_with("un-id-cualquiera-"), true,
		"key_for sigue componiendo cilindrada/arquetipo para cualquier id")


func _test_lista_circuitos_del_servidor_sin_duplicar_los_locales() -> void:
	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var director: RaceDirector = main.get_node("RaceDirector")
	director.set_process(false)
	var menu: CanvasLayer = main.get_node("MainMenu")

	await _settle()

	_check(_find_button(menu, "Circuito del Puerto") != null, true,
		"el circuito del servidor aparece en la pestaña Jugar")
	_check(_find_button(menu, "Kenney 50cc") == null, true,
		"la variante que ya representa a un circuito local no se duplica")

	main.queue_free()
	await get_tree().process_frame


func _test_elegir_circuito_de_servidor_marca_track_is_server() -> void:
	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var director: RaceDirector = main.get_node("RaceDirector")
	director.set_process(false)
	var menu: CanvasLayer = main.get_node("MainMenu")

	await _settle()

	var button := _find_button(menu, "Circuito del Puerto")
	_check(button != null, true, "encuentra el botón del circuito del servidor")
	if button == null:
		main.queue_free()
		return

	button.pressed.emit()
	await get_tree().process_frame

	_check(GameSettings.track_id, "circuito-del-puerto",
		"elegirlo actualiza el track_id al slug del servidor")
	_check(GameSettings.track_is_server, true,
		"y lo marca como circuito de servidor")
	_check(GameSettings.track_key(), "circuito-del-puerto",
		"track_key() lo usa tal cual, sin componer cilindrada/sentido/arquetipo")

	main.queue_free()
	await get_tree().process_frame


# --- Utilidades ---------------------------------------------------------------

func _settle() -> void:
	for i in 90:
		await get_tree().process_frame


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
