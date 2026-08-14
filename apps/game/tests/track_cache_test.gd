extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la caché de circuitos descargados (TASK-245):
##
##     godot --headless --quit-after 600 res://tests/track_cache_test.tscn
##
## Servidor falso de verdad (TCPServer + HTTP a mano), mismo motivo que
## `lap_queue_test.gd`: lo interesante aquí es qué pasa sin red, y eso no se
## puede probar contra la API real.

var _failures := 0
var _server := TCPServer.new()
var _port := 0
var _requests := 0

const SLUG := "circuito-descargado"
const BODY := '{"slug":"circuito-descargado","name":"Circuito Descargado","sectorCount":4,"path":[{"x":0,"y":0},{"x":0,"y":1},{"x":1,"y":1,"terrain":"MUD"},{"x":1,"y":0}],"theme":"SNOW","grip":0.8}'


func _ready() -> void:
	TestEnv.reset()
	TrackCache.clear()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	Api.access_token = "token-de-prueba"
	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	await _test_descarga_y_convierte()
	await _test_segunda_vez_no_pide_red()
	await _test_sobrevive_a_reiniciar()
	await _test_sin_red_y_sin_cache_da_null()

	_server.stop()
	TrackCache.clear()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _process(_delta: float) -> void:
	while _server.is_connection_available():
		var peer := _server.take_connection()
		_requests += 1
		peer.put_data((
			"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s"
			% [BODY.to_utf8_buffer().size(), BODY]).to_utf8_buffer())


# --- Casos --------------------------------------------------------------------

func _test_descarga_y_convierte() -> void:
	var before := _requests
	var layout: TrackCatalog.Layout = await TrackCache.get_or_fetch(SLUG)

	_check(layout != null, true, "descarga un circuito no cacheado")
	_check_eq(_requests, before + 1, "hace una petición de red")
	if layout == null:
		return

	_check_eq(layout.id, SLUG, "slug")
	_check_eq(layout.name, "Circuito Descargado", "nombre")
	_check_eq(layout.path, [Vector2i(0, 0), Vector2i(0, 1), Vector2i(1, 1), Vector2i(1, 0)], "trazado")
	_check_eq(layout.checkpoints, 3, "checkpoints = sectorCount - 1")
	_check_eq(layout.theme, TrackTheme.Kind.SNOW, "tema")
	_check_eq(layout.grip, 0.8, "agarre")
	_check_eq(layout.terrain.get(Vector2i(1, 1), -1), TrackTerrain.Kind.MUD, "terreno de sección")


func _test_segunda_vez_no_pide_red() -> void:
	var before := _requests
	var layout: TrackCatalog.Layout = await TrackCache.get_or_fetch(SLUG)

	_check(layout != null, true, "la segunda vez sigue devolviendo el layout")
	_check_eq(_requests, before, "pero sin tocar la red: viene de caché")


func _test_sobrevive_a_reiniciar() -> void:
	var reloaded := ConfigFile.new()
	var loaded := reloaded.load("user://track_cache.cfg") == OK
	_check(loaded, true, "la caché está escrita en disco")

	var stored: Dictionary = reloaded.get_value("cache", "tracks", {})
	_check(stored.has(SLUG), true, "y con el circuito descargado dentro")


func _test_sin_red_y_sin_cache_da_null() -> void:
	Api.base_url = "http://127.0.0.1:1/v1"  # nadie escucha ahí
	var layout = await TrackCache.get_or_fetch("otro-circuito-nunca-pedido")
	_check(layout, null, "sin red y sin caché previa, null en vez de fallar")

	Api.base_url = "http://127.0.0.1:%d/v1" % _port


# --- Utilidades ---------------------------------------------------------------

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
