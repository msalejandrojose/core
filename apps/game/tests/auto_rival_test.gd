extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del rival automático en la vuelta suelta (TASK-277):
##
##     godot --headless --quit-after 800 res://tests/auto_rival_test.tscn
##
## Mismo motivo y mismo diseño de servidor falso que `online_race_test.gd`:
## `OS.delay_msec` congela el bucle del motor que el propio `HTTPRequest`
## necesita para avanzar, así que hace falta un `TCPServer` de verdad y no
## bloqueante.

var _failures := 0

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

## Lo que sirve el servidor falso a `GET .../online-races/match` — se cambia
## entre pasos.
var _match_body := '{"trackId":"t1","target":null,"threat":null}'

var _main: Node
var _director: RaceDirector
var _menu: Node


func _ready() -> void:
	TestEnv.reset()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	_main = load("res://scenes/main.tscn").instantiate()
	add_child(_main)
	await get_tree().physics_frame

	_director = _main.get_node("RaceDirector")
	_menu = _main.get_node("MainMenu")

	await _test_con_sesion_y_objetivo_aparece_el_rival()
	await _test_sin_sesion_no_pide_nada()
	await _test_con_sesion_pero_sin_objetivo_no_hay_rival()
	await _test_no_pisa_una_carrera_online_explicita()

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
			_reply(peer)
		else:
			still_pending.append(entry)
	_pending = still_pending


func _is_request_complete(text: String) -> bool:
	return text.find("\r\n\r\n") != -1


func _reply(peer: StreamPeerTCP) -> void:
	var body_bytes := _match_body.to_utf8_buffer()
	var header := (
		"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"
		% body_bytes.size())
	peer.put_data(header.to_utf8_buffer() + body_bytes)


# --- Casos --------------------------------------------------------------------

func _test_con_sesion_y_objetivo_aparece_el_rival() -> void:
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	_match_body = '{"trackId":"t1","target":{"userId":"rival-1","durationMs":41000,"snapshots":[{"t":0,"pos":{"x":0,"y":0,"z":0},"yaw":0.0},{"t":1000,"pos":{"x":10,"y":0,"z":0},"yaw":0.0}]},"threat":null}'

	_menu.play_pressed.emit()
	await _settle()

	_check(_director._ghost_target.visible, true, "con objetivo en el ranking, su fantasma se pone visible")
	_check(_director._online_target, {}, "sin submission: no es una carrera online, no hay podio que subir")

	_director.open_menu()
	await _settle()


func _test_sin_sesion_no_pide_nada() -> void:
	Session.logout()
	_match_body = '{"trackId":"t1","target":{"userId":"rival-1","durationMs":41000,"snapshots":[{"t":0,"pos":{"x":0,"y":0,"z":0},"yaw":0.0}]},"threat":null}'

	_menu.play_pressed.emit()
	await _settle()

	_check(_director._ghost_target.visible, false, "sin sesión, no hay con quién identificar al jugador — no se ofrece rival")

	_director.open_menu()
	await _settle()


func _test_con_sesion_pero_sin_objetivo_no_hay_rival() -> void:
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	_match_body = '{"trackId":"t1","target":null,"threat":null}'

	_menu.play_pressed.emit()
	await _settle()

	_check(_director._ghost_target.visible, false, "sin nadie por delante en el ranking, no aparece rival")

	_director.open_menu()
	await _settle()


## El rival "de regalo" no puede pisar una carrera online explícita
## (TASK-284/285) que arranca DESPUÉS de pulsar "Correr" pero ANTES de que
## responda el emparejamiento automático de TASK-277.
func _test_no_pisa_una_carrera_online_explicita() -> void:
	_match_body = '{"trackId":"t1","target":{"userId":"auto-rival","durationMs":50000,"snapshots":[{"t":0,"pos":{"x":0,"y":0,"z":0},"yaw":0.0}]},"threat":null}'

	_menu.play_pressed.emit()

	# Antes de que el servidor falso responda, una carrera online explícita
	# se cuela por delante — mismo camino que tomaría el botón "Carrera
	# Online" del menú.
	_director.start_online_race(
		{"userId": "explicit-rival", "durationMs": 40000, "snapshots": [{"t": 0, "pos": {"x": 0, "y": 0, "z": 0}, "yaw": 0.0}]},
		{})

	await _settle()

	_check(_director._online_target.get("userId"), "explicit-rival",
		"la carrera online explícita manda: el rival de regalo no la sobreescribe")

	_director.open_menu()
	await _settle()


# --- Utilidades ---------------------------------------------------------------

func _settle() -> void:
	for i in 60:
		await get_tree().process_frame


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
