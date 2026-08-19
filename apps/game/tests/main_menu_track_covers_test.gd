extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la portada de circuito en la rejilla rápida del menú principal
## (`main_menu.gd`, `_load_track_covers()`) — mismo mecanismo que
## `track_select_screen.gd` (ver los tests ahí para la cobertura completa
## de `_cover_slug`), aquí solo se comprueba que llega hasta la tarjeta
## correcta de la rejilla rápida.
##
##     godot --headless --quit-after 800 res://tests/main_menu_track_covers_test.tscn

var _failures := 0

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

## `kenney-01-100cc-normal` es la variante de "portada" de Kenney — con
## imagen, para comprobar que llega a la tarjeta rápida correcta.
var _tracks_payload := {
	"data": [
		{
			"slug": "kenney-01-100cc-normal", "name": "Kenney 100cc", "sectorCount": 4,
			"imageUrl": "/files/view?token=test-token",
		},
	],
	"nextCursor": null,
}

const _TEST_PNG_BASE64 := "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


func _ready() -> void:
	TestEnv.reset()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var director: RaceDirector = main.get_node("RaceDirector")
	director.set_process(false)
	var menu: CanvasLayer = main.get_node("MainMenu")

	# `_load_track_covers()` ya se disparó desde `_build()` al abrir el
	# menú (`_ready()` de `RaceDirector` lo hace antes de que este test
	# llegue a mirar nada) — solo hace falta esperar a que responda el
	# servidor falso.
	await _settle()

	var kenney_id := TrackCatalog.DEFAULT_ID
	var thumbnail: TextureRect = menu._cover_thumbnails.get(kenney_id)
	_check(thumbnail != null, true, "la tarjeta rápida de Kenney tiene un TextureRect de portada")
	_check(thumbnail != null and thumbnail.texture != null, true,
		"y le llega la imagen subida en el backoffice a su variante de portada")

	var other_id: String = TrackCatalog.ids()[1]
	var other_thumbnail: TextureRect = menu._cover_thumbnails.get(other_id)
	_check(other_thumbnail != null, true, "otro circuito local también tiene su TextureRect")
	_check(other_thumbnail != null and other_thumbnail.texture == null, true,
		"pero sin portada subida, se queda con el color liso (sin textura)")

	_server.stop()

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


func _settle() -> void:
	for i in 90:
		await get_tree().process_frame


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
