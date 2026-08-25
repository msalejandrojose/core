extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la cola de tiempos pendientes:
##
##     godot --quit-after 2400 res://tests/lap_queue_test.tscn
##
## Aquí SÍ hace falta simular: lo que se prueba es qué pasa cuando el servidor
## no está, o cuando rechaza. Contra la API real solo se puede probar el camino
## feliz, y el camino feliz no es el interesante de una cola.
##
## El servidor falso es un `TCPServer` de verdad hablando HTTP: así se ejercita
## el cliente entero, sockets incluidos, y no una versión de mentira suya.

var _failures := 0
var _server := TCPServer.new()
var _port := 0
## Qué contesta el servidor falso: 201 acepta, 422 rechaza para siempre.
var _reply_status := 201
var _requests := 0


func _ready() -> void:
	TestEnv.reset()
	LapQueue.clear()

	# Puerto libre elegido por el sistema.
	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)

	# Sesión de mentira: la cola solo mira si hay token, no lo valida.
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	await _test_encola_y_sube()
	await _test_sin_red_se_queda()
	await _test_sobrevive_a_reiniciar()
	await _test_rechazo_definitivo_no_atasca()
	await _test_sin_sesion_no_se_pierde()

	LapQueue.clear()
	Session.logout()
	_server.stop()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


## Atiende las peticiones del cliente. Sin esto, el cliente se queda esperando.
func _process(_delta: float) -> void:
	while _server.is_connection_available():
		var peer := _server.take_connection()
		_requests += 1
		var body := '{"lapTime":{},"personalBest":true,"position":1}'
		if _reply_status != 201:
			body = '{"code":"RACING_IMPLAUSIBLE_LAP_TIME","message":"no"}'
		peer.put_data((
			"HTTP/1.1 %d OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s"
			% [_reply_status, body.length(), body]).to_utf8_buffer())


# --- Casos --------------------------------------------------------------------

func _test_encola_y_sube() -> void:
	_reply_status = 201
	LapQueue.enqueue("kenney-01", 42350, [10120, 21400, 33900, 42350])
	await _settle()

	_check_eq(LapQueue.pending_count(), 0, "con servidor, la cola se vacía sola")


func _test_sin_red_se_queda() -> void:
	# Se apunta a un puerto donde no hay nadie: eso es quedarse sin red.
	Api.base_url = "http://127.0.0.1:1/v1"
	LapQueue.enqueue("kenney-01", 41000, [10000, 20000, 30000, 41000])
	await _settle()

	_check_eq(LapQueue.pending_count(), 1, "sin red el tiempo NO se pierde")


func _test_sobrevive_a_reiniciar() -> void:
	# Lo que hay en memoria tiene que estar también en disco: un jugador que
	# cierra el juego tras su mejor vuelta del día no puede perderla.
	var reloaded := ConfigFile.new()
	var loaded := reloaded.load("user://pending_laps.cfg") == OK
	_check(loaded, true, "la cola está escrita en disco")

	var stored: Array = reloaded.get_value("queue", "laps", [])
	_check_eq(stored.size(), 1, "y con el tiempo pendiente dentro")


func _test_rechazo_definitivo_no_atasca() -> void:
	# El servidor vuelve, pero rechaza. Reintentar un tiempo que el servidor ya
	# ha dicho que no vale es atascar la cola para siempre.
	Api.base_url = "http://127.0.0.1:%d/v1" % _port
	_reply_status = 422
	await LapQueue.flush()
	await _settle()

	_check_eq(LapQueue.pending_count(), 0, "un rechazo definitivo se descarta")


func _test_sin_sesion_no_se_pierde() -> void:
	_reply_status = 201
	Session.access_token = ""
	Api.access_token = ""

	LapQueue.enqueue("kenney-01", 40000, [10000, 20000, 30000, 40000])
	await _settle()
	_check_eq(LapQueue.pending_count(), 1, "sin sesión se guarda, no se tira")

	# Y al entrar se suelta lo pendiente.
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	await LapQueue.flush()
	await _settle()
	_check_eq(LapQueue.pending_count(), 0, "al entrar, se sube lo que quedaba")


# --- Utilidades ---------------------------------------------------------------

func _settle() -> void:
	for i in 60:
		await get_tree().process_frame


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
