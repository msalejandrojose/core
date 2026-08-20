extends Node

## Cliente de la sala de carrera en vivo (TASK-323, tareas 2-6).
##
## Autoload registrado como `LiveRaceSocket` en project.godot.
##
## Un único `WebSocketPeer` para toda la sesión online — se abre al buscar
## partida (`connect_and_join`) y se mantiene vivo a través de la cola, la
## cuenta atrás y la carrera, hasta `disconnect_socket()`: reconectar entre
## pantallas perdería el sitio en la sala (o el grace period de reconexión
## del servidor, ver `LiveRaceRoomManager`).
##
## Igual que `Api`: nunca lanza. Un error de red durante el matchmaking no
## puede tumbar el juego — se traduce a la señal `connection_failed` y quien
## esté escuchando decide qué mostrar.

signal room_update(room_id: String, status: String, player_ids: Array)
signal countdown(room_id: String, ms: int)
signal race_started(room_id: String, start_at: int)
signal snapshot_received(room_id: String, from_user_id: String, snapshot: Dictionary)
signal race_finished(room_id: String, race_id: String, result: Array, rating_changes: Array)
signal participant_disconnected(room_id: String, user_id: String)
## Fallo de conexión O rechazo explícito del servidor (circuito no
## encontrado, token inválido) — un único canal de error, quien escucha no
## tiene por qué distinguir el motivo para mostrar "no se pudo conectar".
signal connection_failed(reason: String)

const Protocol := preload("res://scripts/net/socket_io_protocol.gd")
const NSP := "/racing-live"

enum _State { IDLE, CONNECTING, ENGINE_OPEN, NAMESPACE_CONNECTED }

var _peer: WebSocketPeer
var _state: int = _State.IDLE
var _pending_track_slug: String = ""


func _ready() -> void:
	set_process(false)


## Abre la conexión (si no había una) y pide unirse a la cola de ese
## circuito en cuanto el namespace confirme — no hace falta esperar aquí, el
## resultado llega por la señal `room_update`.
func connect_and_join(track_slug: String) -> void:
	disconnect_socket()

	_pending_track_slug = track_slug
	_peer = WebSocketPeer.new()
	var url := Protocol.websocket_url(Api.base_url)
	var error := _peer.connect_to_url(url)
	if error != OK:
		_peer = null
		connection_failed.emit("No se pudo abrir la conexión.")
		return

	_state = _State.CONNECTING
	set_process(true)


## Sale de la cola/sala sin cerrar necesariamente la conexión de golpe — el
## propio `close()` ya la corta. Llamarlo sin estar conectado no hace nada.
func leave() -> void:
	if _state == _State.NAMESPACE_CONNECTED:
		_send_raw(Protocol.encode_event(NSP, "racing-live:leave", null))
	disconnect_socket()


## Instantánea de posición durante la carrera — mismo formato que graba
## `RaceDirector` para los fantasmas (TASK-219), reutilizado tal cual como
## paquete de red.
func send_snapshot(t: int, pos: Vector3, yaw: float) -> void:
	if _state != _State.NAMESPACE_CONNECTED:
		return
	_send_raw(Protocol.encode_event(NSP, "racing-live:snapshot", {
		"t": t,
		"pos": {"x": pos.x, "y": pos.y, "z": pos.z},
		"yaw": yaw,
	}))


func send_finish(duration_ms: int) -> void:
	if _state != _State.NAMESPACE_CONNECTED:
		return
	_send_raw(Protocol.encode_event(NSP, "racing-live:finish", {"durationMs": duration_ms}))


func is_connected_to_room() -> bool:
	return _state == _State.NAMESPACE_CONNECTED


func disconnect_socket() -> void:
	if _peer != null:
		_peer.close()
	_peer = null
	_state = _State.IDLE
	set_process(false)


func _process(_delta: float) -> void:
	if _peer == null:
		return

	_peer.poll()
	var ready_state := _peer.get_ready_state()

	if ready_state == WebSocketPeer.STATE_CLOSED:
		var was_active := _state != _State.IDLE
		_peer = null
		_state = _State.IDLE
		set_process(false)
		if was_active:
			connection_failed.emit("Conexión perdida con el servidor.")
		return

	if ready_state != WebSocketPeer.STATE_OPEN:
		return

	while _peer != null and _peer.get_available_packet_count() > 0:
		_handle_packet(_peer.get_packet().get_string_from_utf8())


func _handle_packet(raw: String) -> void:
	var packet := Protocol.decode_packet(raw)
	if packet.is_empty():
		return

	match packet.get("eio_type"):
		"0":
			# Engine.IO "open": la sesión de transporte está lista, toca pedir
			# el namespace con el JWT como auth.
			_state = _State.ENGINE_OPEN
			_send_raw(Protocol.encode_connect(NSP, {"token": Session.access_token}))
		"2":
			# Ping de mantenimiento — sin pong, el servidor cierra por
			# inactividad pasado `pingTimeout`.
			_send_raw(Protocol.encode_pong())
		"4":
			_handle_message(packet)


func _handle_message(packet: Dictionary) -> void:
	if packet.get("nsp") != NSP:
		return

	match packet.get("sio_type"):
		"0":
			# Socket.IO CONNECT ack: el namespace ya está abierto, ahora sí se
			# puede pedir sala.
			_state = _State.NAMESPACE_CONNECTED
			_send_raw(Protocol.encode_event(NSP, "racing-live:join", {"trackSlug": _pending_track_slug}))
		"4":
			connection_failed.emit("El servidor rechazó la conexión.")
		"2":
			_dispatch_event(Protocol.split_event(packet.get("payload")))


func _dispatch_event(event: Dictionary) -> void:
	var data: Dictionary = event.get("data", {})
	match event.get("name"):
		"room-update":
			room_update.emit(
				str(data.get("roomId", "")), str(data.get("status", "")), data.get("playerIds", []))
		"countdown":
			countdown.emit(str(data.get("roomId", "")), int(data.get("ms", 0)))
		"race-started":
			race_started.emit(str(data.get("roomId", "")), int(data.get("startAt", 0)))
		"snapshot":
			var snap: Variant = data.get("snapshot", {})
			snapshot_received.emit(
				str(data.get("roomId", "")), str(data.get("fromUserId", "")),
				snap if snap is Dictionary else {})
		"race-finished":
			race_finished.emit(
				str(data.get("roomId", "")), str(data.get("raceId", "")),
				data.get("result", []), data.get("ratingChanges", []))
		"participant-disconnected":
			participant_disconnected.emit(str(data.get("roomId", "")), str(data.get("userId", "")))
		"racing-live:error":
			connection_failed.emit(str(data.get("reason", "Error del servidor.")))


func _send_raw(text: String) -> void:
	if _peer != null:
		_peer.send_text(text)
