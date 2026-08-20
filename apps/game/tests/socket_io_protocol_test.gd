extends Node

## Prueba del framing Engine.IO/Socket.IO a mano de `socket_io_protocol.gd`
## (TASK-323, tarea 6) — funciones puras, sin socket real de por medio.
##
##     godot --headless --quit-after 60 res://tests/socket_io_protocol_test.tscn

const Protocol := preload("res://scripts/net/socket_io_protocol.gd")

var _failures := 0


func _ready() -> void:
	_test_websocket_url_deriva_de_la_base_http()
	_test_websocket_url_soporta_https()
	_test_encode_connect()
	_test_encode_event_con_payload()
	_test_encode_event_sin_payload()
	_test_encode_pong()
	_test_decode_open()
	_test_decode_ping()
	_test_decode_connect_ack()
	_test_decode_event()
	_test_decode_frame_vacio()
	_test_split_event()
	_test_split_event_defensivo()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_websocket_url_deriva_de_la_base_http() -> void:
	var got := Protocol.websocket_url("http://192.168.1.5:3000/v1")
	_check(got, "ws://192.168.1.5:3000/socket.io/?EIO=4&transport=websocket",
		"deriva ws:// del host:puerto, sin el sufijo /v1")


func _test_websocket_url_soporta_https() -> void:
	var got := Protocol.websocket_url("https://api.core.dev/v1")
	_check(got, "wss://api.core.dev/socket.io/?EIO=4&transport=websocket",
		"https:// se traduce a wss://")


func _test_encode_connect() -> void:
	var got := Protocol.encode_connect("/racing-live", {"token": "abc"})
	_check(got, "40/racing-live,{\"token\":\"abc\"}",
		"CONNECT abre el namespace con el token como auth")


func _test_encode_event_con_payload() -> void:
	var got := Protocol.encode_event("/racing-live", "racing-live:join", {"trackSlug": "kenney-01"})
	_check(got, "42/racing-live,[\"racing-live:join\",{\"trackSlug\":\"kenney-01\"}]",
		"un evento con payload se envuelve en el frame de mensaje")


func _test_encode_event_sin_payload() -> void:
	var got := Protocol.encode_event("/racing-live", "racing-live:leave", null)
	_check(got, "42/racing-live,[\"racing-live:leave\"]",
		"un evento sin payload no añade un segundo elemento al array")


func _test_encode_pong() -> void:
	_check(Protocol.encode_pong(), "3", "el pong es el tipo Engine.IO 3, sin más")


func _test_decode_open() -> void:
	var packet := Protocol.decode_packet("0{\"sid\":\"abc\"}")
	_check(packet.get("eio_type"), "0", "un frame que no es tipo 4 solo trae eio_type")
	_check(packet.has("sio_type"), false, "y no intenta parsear un cuerpo Socket.IO que no existe")


func _test_decode_ping() -> void:
	var packet := Protocol.decode_packet("2")
	_check(packet.get("eio_type"), "2", "el ping de mantenimiento se reconoce por su tipo")


func _test_decode_connect_ack() -> void:
	var packet := Protocol.decode_packet("40/racing-live,{\"sid\":\"xyz\"}")
	_check(packet.get("eio_type"), "4", "un CONNECT ack es un mensaje Engine.IO")
	_check(packet.get("sio_type"), "0", "de tipo Socket.IO CONNECT")
	_check(packet.get("nsp"), "/racing-live", "con el namespace confirmado")
	_check((packet.get("payload") as Dictionary).get("sid"), "xyz", "y el sid de esa conexión")


func _test_decode_event() -> void:
	var packet := Protocol.decode_packet(
		"42/racing-live,[\"countdown\",{\"roomId\":\"r1\",\"ms\":3000}]")
	_check(packet.get("sio_type"), "2", "un evento entrante es tipo Socket.IO EVENT")
	_check(packet.get("nsp"), "/racing-live", "con su namespace")
	var event := Protocol.split_event(packet.get("payload"))
	_check(event.get("name"), "countdown", "y el nombre del evento se separa bien")
	_check((event.get("data") as Dictionary).get("ms"), 3000, "junto con sus datos")


func _test_decode_frame_vacio() -> void:
	_check(Protocol.decode_packet(""), {}, "un frame vacío no se interpreta como nada")


func _test_split_event() -> void:
	var event := Protocol.split_event(["race-started", {"roomId": "r1"}])
	_check(event.get("name"), "race-started", "separa el nombre")
	_check((event.get("data") as Dictionary).get("roomId"), "r1", "y los datos")


## Un servidor mal portado (o un frame corrupto) no puede tumbar el cliente
## — sin datos, o con algo que no es ni un array ni un diccionario, se
## queda en valores vacíos en vez de lanzar.
func _test_split_event_defensivo() -> void:
	_check(Protocol.split_event(null), {"name": "", "data": {}},
		"payload null da nombre y datos vacíos")
	_check(Protocol.split_event(["solo-nombre"]), {"name": "solo-nombre", "data": {}},
		"un evento sin segundo elemento da datos vacíos, no falla")
	_check(Protocol.split_event(["nombre", "no-es-un-diccionario"]),
		{"name": "nombre", "data": {}},
		"si el segundo elemento no es un diccionario, se descarta en vez de propagarlo")


# --- Utilidades ---------------------------------------------------------------

func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
