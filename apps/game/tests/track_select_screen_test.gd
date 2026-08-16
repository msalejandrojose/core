extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la pantalla de selección de circuito (antes una fila de botones
## dentro del menú principal — ver `git log` de `main_menu.gd` para el porqué
## del traslado):
##
##     godot --headless --quit-after 800 res://tests/track_select_screen_test.tscn
##
## Servidor falso de verdad (TCPServer + HTTP a mano, no bloqueante — mismo
## motivo y diseño que `online_race_test.gd`).

var _failures := 0
## Miembro y no local: una lambda de GDScript captura las locales por VALOR
## (mismo aviso que en `main_menu_hub_test.gd`/`race_flow_test.gd`), así que
## escribir en una local desde dentro de la lambda no se vería fuera de ella.
var _confirmed_fired := false

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

## `kenney-01-50cc-normal` es una variante de uno de los 4 del catálogo local
## (empieza por "kenney-01-") — tiene que quedar filtrada. `circuito-del-
## puerto` es un circuito de verdad nacido en el backoffice — tiene que
## aparecer. La clave del array es "data", la misma forma que
## `CursorPaginatedResponseDto` (`apps/api/.../cursor-paginated-response.dto.ts`).
var _tracks_payload := {
	"data": [
		{"slug": "kenney-01-50cc-normal", "name": "Kenney 50cc", "sectorCount": 4},
		{
			"slug": "circuito-del-puerto", "name": "Circuito del Puerto", "sectorCount": 3,
			"imageUrl": "/files/view?token=test-token",
		},
	],
	"nextCursor": null,
}

## PNG 1x1 transparente real (no un placeholder) — para probar la descarga y
## decodificación de verdad en `_test_la_tarjeta_del_servidor_carga_miniatura`,
## sin depender de un fichero en disco.
const _TEST_PNG_BASE64 := "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


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
	await _test_la_tarjeta_del_servidor_carga_miniatura()
	await _test_confirmar_aplica_la_seleccion_pendiente()
	await _test_atras_no_aplica_nada()

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

	if request_line.begins_with("GET") and request_line.find("/files/view") != -1:
		var png_bytes := Marshalls.base64_to_raw(_TEST_PNG_BASE64)
		var image_header := (
			"HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"
			% png_bytes.size())
		peer.put_data(image_header.to_utf8_buffer() + png_bytes)
		return

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
	var screen := await _open_screen()

	_check(_find_label(screen, "Circuito del Puerto") != null, true,
		"el circuito del servidor aparece en la rejilla")
	_check(_find_label(screen, "Kenney 50cc") == null, true,
		"la variante que ya representa a un circuito local no se duplica")

	screen.close_screen()
	await get_tree().process_frame


## El circuito local ("Kenney 50cc"/los 4 de fábrica) no manda `imageUrl` —
## esa tabla no tiene miniatura, solo los circuitos nacidos en el backoffice.
## Solo la tarjeta del servidor debe acabar con una `TextureRect` con textura
## de verdad (descargada y decodificada, no un hueco vacío).
func _test_la_tarjeta_del_servidor_carga_miniatura() -> void:
	var screen := await _open_screen()
	# Un frame más: la descarga de la imagen es su propia petición HTTP,
	# aparte de la del listado, y necesita su propia vuelta del servidor
	# falso.
	await _settle()

	var button := _find_card_button(screen, "Circuito del Puerto")
	_check(button != null, true, "encuentra la tarjeta del circuito del servidor")
	if button == null:
		screen.close_screen()
		return

	var card: Node = button.get_parent()
	var thumbnail := _find_texture_rect(card)
	_check(thumbnail != null, true, "la tarjeta del servidor monta un TextureRect")
	_check(thumbnail != null and thumbnail.texture != null, true,
		"y la miniatura se descarga y decodifica de verdad")

	screen.close_screen()


func _test_confirmar_aplica_la_seleccion_pendiente() -> void:
	GameSettings.set_track_id(TrackCatalog.DEFAULT_ID, false)
	var screen := await _open_screen()

	var button := _find_card_button(screen, "Circuito del Puerto")
	_check(button != null, true, "encuentra el botón de la tarjeta del circuito del servidor")
	if button == null:
		screen.close_screen()
		return

	button.pressed.emit()
	_check(GameSettings.track_id, TrackCatalog.DEFAULT_ID,
		"elegir una tarjeta todavía no aplica nada")

	_confirmed_fired = false
	screen.confirmed.connect(func() -> void: _confirmed_fired = true)

	var confirm_button := _find_button(screen, "Confirmar circuito")
	confirm_button.pressed.emit()
	await get_tree().process_frame

	_check(GameSettings.track_id, "circuito-del-puerto",
		"confirmar aplica el track_id del servidor elegido")
	_check(GameSettings.track_is_server, true, "y lo marca como circuito de servidor")
	_check(GameSettings.track_key(), "circuito-del-puerto",
		"track_key() lo usa tal cual, sin componer cilindrada/sentido/arquetipo")
	_check(_confirmed_fired, true, "avisa con la señal `confirmed` de que cambió")


func _test_atras_no_aplica_nada() -> void:
	GameSettings.set_track_id(TrackCatalog.DEFAULT_ID, false)
	var screen := await _open_screen()

	var button := _find_card_button(screen, "Circuito del Puerto")
	button.pressed.emit()

	var back_button := _find_button(screen, "Atrás")
	back_button.pressed.emit()
	await get_tree().process_frame

	_check(GameSettings.track_id, TrackCatalog.DEFAULT_ID,
		"volver atrás no aplica la tarjeta que se había tocado")


# --- Utilidades ---------------------------------------------------------------

func _open_screen() -> Node:
	# `GameSettings.set_track_id()` (confirmar una tarjeta) emite `changed`, y
	# `Api` escucha esa señal para recalcular `base_url` desde los ajustes
	# reales — en el juego de verdad eso no cambia nada (siempre vuelve al
	# mismo valor configurado), pero aquí pisa el `base_url` que apunta al
	# servidor falso. Se reafirma antes de cada apertura para no depender del
	# orden de los casos.
	Api.base_url = "http://127.0.0.1:%d/v1" % _port
	var screen: CanvasLayer = load("res://scenes/ui/track-select-screen.tscn").instantiate()
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


func _find_label(root: Node, text: String) -> Label:
	if root is Label and root.text == text:
		return root
	for child in root.get_children():
		var found := _find_label(child, text)
		if found != null:
			return found
	return null


## El nombre del circuito vive en una `Label` dentro de la tarjeta (un
## `VBoxContainer`); el botón "Seleccionar"/"Seleccionado" es el único
## `Button` hijo de esa misma tarjeta.
func _find_texture_rect(root: Node) -> TextureRect:
	if root is TextureRect:
		return root
	for child in root.get_children():
		var found := _find_texture_rect(child)
		if found != null:
			return found
	return null


func _find_card_button(root: Node, track_name: String) -> Button:
	var label := _find_label(root, track_name)
	if label == null:
		return null
	return _find_button(label.get_parent(), "Seleccionar") \
		if _find_button(label.get_parent(), "Seleccionar") != null \
		else _find_button(label.get_parent(), "Seleccionado")


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
