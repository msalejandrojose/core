extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la pantalla de taller.
##
##     godot --headless --quit-after 800 res://tests/workshop_screen_test.tscn
##
## Los dos primeros casos son de humo (sin cuenta / sin servidor no rompe).
## Los siguientes usan un servidor falso de verdad (mismo diseño no
## bloqueante que `friends_screen_test.gd`) para probar que elegir una
## variante en la lista solo previsualiza — no llama a la API — hasta que se
## confirma con "Cambiar".

var _failures := 0

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

var _catalog_payload := {
	"archetypes": [
		{"id": "arch-normal", "code": "normal", "name": "Normal", "offroadGripModifier": 1.0},
		{"id": "arch-f1", "code": "f1", "name": "F1", "offroadGripModifier": 0.7},
		{"id": "arch-4x4", "code": "4x4", "name": "4x4", "offroadGripModifier": 1.3},
	],
	"parts": [],
}
var _loadout_payload := {
	"archetype": {"id": "arch-normal", "code": "normal", "name": "Normal", "offroadGripModifier": 1.0},
	"tiresPart": null,
	"wingPart": null,
	"chassisPart": null,
	"stats": {"speedScale": 1.0, "grip": 1.0},
}
var _patch_count := 0
var _last_patch_body := ""


func _ready() -> void:
	TestEnv.reset()
	Session.access_token = ""

	await _test_sin_cuenta_bloquea()
	await _test_con_cuenta_sin_servidor_no_rompe()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	await _test_elegir_variante_solo_previsualiza()
	await _test_cambiar_confirma_y_guarda()

	_server.stop()
	Session.access_token = ""

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

	var reply_body := "{}"
	if request_line.begins_with("GET") and request_line.find("/cars/catalog") != -1:
		reply_body = JSON.stringify(_catalog_payload)
	elif request_line.begins_with("GET") and request_line.find("/cars/me") != -1:
		reply_body = JSON.stringify(_loadout_payload)
	elif request_line.begins_with("PATCH") and request_line.find("/cars/me") != -1:
		_patch_count += 1
		_last_patch_body = body
		var parsed: Variant = JSON.parse_string(body)
		var archetype_id: String = parsed.get("archetypeId", "arch-normal") if parsed is Dictionary else "arch-normal"
		_loadout_payload["archetype"] = _find_archetype(archetype_id)
		reply_body = JSON.stringify(_loadout_payload)

	var body_bytes := reply_body.to_utf8_buffer()
	var header := (
		"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"
		% body_bytes.size())
	peer.put_data(header.to_utf8_buffer() + body_bytes)


func _find_archetype(id: String) -> Dictionary:
	for archetype in _catalog_payload["archetypes"]:
		if archetype["id"] == id:
			return archetype
	return _catalog_payload["archetypes"][0]


# --- Casos --------------------------------------------------------------------

func _test_sin_cuenta_bloquea() -> void:
	Session.access_token = ""

	var screen: CanvasLayer = load("res://scenes/ui/workshop-screen.tscn").instantiate()
	add_child(screen)
	await get_tree().process_frame

	_check(screen.get("_status") != null, true, "sin cuenta muestra un mensaje")
	_check(_find_button_text(screen, "Cerrar") != null, true, "sin cuenta hay botón para cerrar")

	screen.queue_free()
	await get_tree().process_frame


func _test_con_cuenta_sin_servidor_no_rompe() -> void:
	Session.access_token = "fake-token-para-el-test"
	# Puerto que rechaza la conexión al instante: falla rápido y a propósito,
	# sin esperar a los 10s de timeout de una IP que no contesta.
	Api.base_url = "http://127.0.0.1:1/v1"

	var screen: CanvasLayer = load("res://scenes/ui/workshop-screen.tscn").instantiate()
	add_child(screen)

	# Da tiempo a que la petición falle y la pantalla reaccione, sin colgarse
	# esperando algo que nunca llega.
	for i in 60:
		await get_tree().process_frame

	_check(_find_button_text(screen, "Cerrar") != null, true,
		"sin servidor, la pantalla no se rompe y deja cerrar")

	screen.queue_free()
	await get_tree().process_frame
	Api.refresh_base_url()


func _test_elegir_variante_solo_previsualiza() -> void:
	_loadout_payload["archetype"] = _find_archetype("arch-normal")
	_patch_count = 0

	var screen := await _open_screen()

	var f1_button := _find_button_text(screen, "F1")
	_check(f1_button != null, true, "aparece la variante F1 en la lista")

	f1_button.pressed.emit()
	await _settle()

	_check(screen._pending_archetype_id, "arch-f1", "elegirla actualiza la previsualización")
	_check(screen._preview_model != null, true, "la vista 3D monta un modelo")
	_check(_patch_count, 0, "pero no guarda nada todavía, sin pulsar Cambiar")
	_check(screen._loadout.get("archetype", {}).get("id", ""), "arch-normal",
		"el arquetipo aplicado de verdad sigue siendo el normal")

	screen.close_screen()


func _test_cambiar_confirma_y_guarda() -> void:
	_loadout_payload["archetype"] = _find_archetype("arch-normal")
	_patch_count = 0

	var screen := await _open_screen()

	var x4_button := _find_button_text(screen, "4x4")
	x4_button.pressed.emit()
	await _settle()

	var change_button := _find_button_text(screen, "Cambiar")
	_check(change_button.disabled, false, "Cambiar se activa al elegir otra variante")

	change_button.pressed.emit()
	await _settle()

	_check(_patch_count, 1, "confirmar guarda una única vez contra la API")
	_check(_last_patch_body.find("arch-4x4") != -1, true, "manda el arquetipo elegido")
	_check(screen._loadout.get("archetype", {}).get("id", ""), "arch-4x4",
		"y queda aplicado de verdad")

	screen.close_screen()


# --- Utilidades ---------------------------------------------------------------

func _open_screen() -> Node:
	var screen: CanvasLayer = load("res://scenes/ui/workshop-screen.tscn").instantiate()
	add_child(screen)
	await _settle()
	return screen


func _settle() -> void:
	for i in 60:
		await get_tree().process_frame


func _find_button_text(node: Node, text: String) -> Button:
	if node is Button and node.text == text:
		return node
	for child in node.get_children():
		var found := _find_button_text(child, text)
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
