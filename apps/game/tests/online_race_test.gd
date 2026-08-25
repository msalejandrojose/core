extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la carrera online con 2 fantasmas simultáneos (TASK-285):
##
##     godot --headless --quit-after 800 res://tests/online_race_test.tscn
##
## `start_online_race()` no hace ninguna llamada de red por sí solo — el
## emparejamiento (TASK-284) ya se resolvió antes, en el menú, y aquí solo
## llegan target/threat como datos. La única llamada de red de este flujo es
## la de SUBIR el resultado al cruzar meta, así que el servidor falso solo
## hace falta para esa — mismo motivo que `lap_queue_test.gd` para ir con un
## `TCPServer` de verdad y no un doble de mentira.

var _failures := 0
var _now: int = 0

var _server := TCPServer.new()
var _port := 0
var _last_request_body := ""

var _target := {
	"userId": "target-1",
	"durationMs": 41000,
	"snapshots": [
		{"t": 0, "pos": {"x": 0, "y": 0, "z": 0}, "yaw": 0.0},
		{"t": 1000, "pos": {"x": 10, "y": 0, "z": 0}, "yaw": 0.0},
	],
}
var _threat := {
	"userId": "threat-1",
	"durationMs": 43000,
	"snapshots": [
		{"t": 0, "pos": {"x": 0, "y": 0, "z": 5}, "yaw": 0.0},
		{"t": 1000, "pos": {"x": 10, "y": 0, "z": 5}, "yaw": 0.0},
	],
}


func _ready() -> void:
	TestEnv.reset()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var timer: LapTimer = main.get_node("LapTimer")
	var director: RaceDirector = main.get_node("RaceDirector")
	var race_hud: CanvasLayer = main.get_node("RaceHud")
	var vehicle: Vehicle = main.get_node("Vehicle")
	var sphere: RigidBody3D = vehicle.get_node("Sphere")

	director.set_process(false)
	VehicleInput.locked = false
	timer.auto_start_on_throttle = false
	timer.clock = func() -> int: return _now

	var key := director.record_key()
	RaceRecords.clear(key)

	_test_dos_fantasmas_a_la_vez(director)
	_test_se_distinguen_objetivo_y_amenaza(director)
	_test_sin_amenaza_no_aparece_ninguna(director)
	await _test_al_cruzar_meta_sube_el_resultado(timer, director, sphere, race_hud)
	await _test_sin_red_la_carrera_se_sigue_jugando(timer, director, sphere)

	RaceRecords.clear(key)
	_server.stop()
	Session.logout()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


## Responde siempre 201 a la subida del resultado, capturando el body para
## poder comprobar qué mandó el cliente.
##
## Sin bloquear: `OS.delay_msec` congela el bucle del motor ENTERO, y es ese
## mismo bucle el que necesita el cliente (`HTTPRequest`) para avanzar su
## propia conexión y mandar los bytes — bloquear aquí a esperarlos los deja
## sin mandar nunca. Se acumula lo que vaya llegando frame a frame, y solo se
## responde cuando la petición ya está completa.
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}


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


## Cruzar meta dispara MÁS de una petición a la vez (el tiempo de vuelta
## normal vía `LapQueue`, la subida de la carrera online, y el leaderboard
## que pide la pantalla de resultado) — todas caen en el mismo servidor
## falso, así que hace falta quedarse solo con la que interesa por su ruta,
## no con "la última que haya llegado".
func _reply(peer: StreamPeerTCP, text: String) -> void:
	var sep := text.find("\r\n\r\n")
	var request_body := text.substr(sep + 4) if sep != -1 else ""
	var request_line := text.split("\r\n")[0] if text.length() > 0 else ""
	if request_line.begins_with("POST") and request_line.find("/online-races ") != -1:
		_last_request_body = request_body

	# Podio + monedas de ejemplo (TASK-287): jugador 2º, gana al objetivo
	# (más lento) pero no a la amenaza (más rápida) — así el podio trae los
	# 3 con posiciones distintas, y coinsEarned trae dos bonos a la vez
	# (2º puesto + amigo vencido) para probar el desglose.
	var reply_body := (
		'{"id":"race-1","trackId":"track-1","createdAt":"2026-01-01T00:00:00.000Z",' +
		'"participants":[' +
		'{"role":"THREAT","userId":"threat-1","durationMs":41000,"position":1,"deltaMs":0},' +
		'{"role":"PLAYER","userId":"player-1","durationMs":42500,"position":2,"deltaMs":1500},' +
		'{"role":"TARGET","userId":"target-1","durationMs":43000,"position":3,"deltaMs":2000}' +
		'],"coinsEarned":[' +
		'{"amount":60,"source":"RACE_SECOND_PLACE"},' +
		'{"amount":60,"source":"BEAT_FRIEND"}' +
		']}')
	peer.put_data((
		"HTTP/1.1 201 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s"
		% [reply_body.length(), reply_body]).to_utf8_buffer())


# --- Casos --------------------------------------------------------------------

func _test_dos_fantasmas_a_la_vez(director: RaceDirector) -> void:
	director.start_online_race(_target, _threat)

	_check(director._ghost_target.visible, true, "el fantasma objetivo se muestra")
	_check(director._ghost_threat.visible, true, "el fantasma amenaza se muestra")

	# Sin física ni colisión, por diseño (`Ghost extends Node3D`, no
	# `CollisionObject3D`) — no pueden chocar entre sí ni con el jugador. Por
	# una variable sin tipo estático: Godot rechaza en tiempo de compilación
	# un `is CollisionObject3D` sobre algo ya tipado como `Ghost`, que nunca
	# podría serlo.
	var target_node: Node = director._ghost_target
	var threat_node: Node = director._ghost_threat
	_check(not (target_node is CollisionObject3D), true,
		"el fantasma objetivo no puede colisionar")
	_check(not (threat_node is CollisionObject3D), true,
		"el fantasma amenaza no puede colisionar")

	director._ghost_target.update_at(500)
	director._ghost_threat.update_at(500)
	_check(director._ghost_target.position.distance_to(Vector3(5, 0, 0)) < 0.001, true,
		"el objetivo interpola su propia trayectoria")
	_check(director._ghost_threat.position.distance_to(Vector3(5, 0, 5)) < 0.001, true,
		"la amenaza interpola la suya, distinta de la del objetivo")


func _test_se_distinguen_objetivo_y_amenaza(director: RaceDirector) -> void:
	_check(director._ghost_target._color != director._ghost_threat._color, true,
		"objetivo y amenaza llevan colores distintos")
	_check(director._ghost_target._color != Ghost.GHOST_COLOR, true,
		"el objetivo no usa el azul del fantasma del propio récord")
	_check(director._ghost_threat._color != Ghost.GHOST_COLOR, true,
		"la amenaza tampoco")


func _test_sin_amenaza_no_aparece_ninguna(director: RaceDirector) -> void:
	director.start_online_race(_target, {})
	_check(director._ghost_target.visible, true, "con solo objetivo, el objetivo se muestra")
	_check(not director._ghost_threat.visible, true, "y no hay amenaza que mostrar")

	# Se deja lista para el resto de casos.
	director.start_online_race(_target, _threat)


func _test_al_cruzar_meta_sube_el_resultado(
	timer: LapTimer, director: RaceDirector, sphere: RigidBody3D, race_hud: CanvasLayer
) -> void:
	var online_events: Array = []
	var lap_events: Array = []
	director.online_race_finished.connect(func(data, prev, is_record):
		online_events.append([data, prev, is_record]))
	director.lap_finished.connect(func(d, prev, is_record):
		lap_events.append([d, prev, is_record]))

	timer.start()
	timer.elapsed_ms = 0
	sphere.position = Vector3.ZERO

	for i in timer.checkpoint_count:
		_now += 500
		timer.cross_checkpoint(i)

	_now += 2000
	timer.cross_finish()  # duración: 2000 + 500*checkpoint_count desde el start

	await _settle()

	_check(_last_request_body.find("\"rivals\"") != -1, true,
		"la subida incluye a los rivales")
	_check(_last_request_body.find("target-1") != -1, true,
		"el objetivo va en el body")
	_check(_last_request_body.find("threat-1") != -1, true,
		"la amenaza también")

	_check(director._online_target.is_empty(), true,
		"tras subir, la carrera online se da por terminada (objetivo)")
	_check(director._online_threat.is_empty(), true,
		"tras subir, la carrera online se da por terminada (amenaza)")
	_check(not director._ghost_target.visible, true,
		"y los fantasmas rivales se ocultan")

	# TASK-287: una carrera online emite `online_race_finished` con el podio
	# y las monedas — NUNCA el `lap_finished` genérico de vuelta suelta.
	_check(online_events.size(), 1, "emite online_race_finished con la respuesta del servidor")
	_check(lap_events.size(), 0, "y NO emite lap_finished (ese es solo para vuelta suelta)")

	var response_data: Dictionary = online_events[0][0]
	var coins: Array = response_data.get("coinsEarned", [])
	_check(coins.size(), 2, "el desglose de monedas llega completo hasta la señal")

	var screen := _find_online_race_result_screen(race_hud)
	_check(screen != null, true, "el HUD instancia OnlineRaceResultScreen, no la genérica")
	if screen != null:
		screen.queue_free()
		await get_tree().process_frame


func _test_sin_red_la_carrera_se_sigue_jugando(timer: LapTimer, director: RaceDirector, sphere: RigidBody3D) -> void:
	# Los fantasmas ya llegaron con la carrera (no se descargan aparte, ver
	# comentario de cabecera) — sin red, la única baja es que no se registra
	# el resultado histórico, pero la vuelta se corre y se guarda igual.
	director.start_online_race(_target, _threat)
	Api.base_url = "http://127.0.0.1:1/v1"  # nadie escucha ahí

	timer.start()
	timer.elapsed_ms = 0
	sphere.position = Vector3.ZERO

	for i in timer.checkpoint_count:
		_now += 500
		timer.cross_checkpoint(i)

	_now += 2500
	timer.cross_finish()

	await _settle()

	_check(RaceRecords.has_best(director.record_key()), true,
		"sin red, la vuelta se sigue guardando en local")
	_check(director._online_target.is_empty(), true,
		"y la carrera online se limpia igual, red o no")

	Api.base_url = "http://127.0.0.1:%d/v1" % _port


# --- Utilidades ---------------------------------------------------------------

## Recursivo y no un simple `get_children()`: igual que en `race_result_test.gd`,
## el nodo "RaceHud" de `main.tscn` es una instancia de sub-escena.
func _find_online_race_result_screen(root: Node) -> Node:
	var script: Script = root.get_script()
	if script != null and script.resource_path.ends_with("online_race_result_screen.gd"):
		return root
	for child in root.get_children():
		var found := _find_online_race_result_screen(child)
		if found != null:
			return found
	return null


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
