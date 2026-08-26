extends Node

## Prueba de `OnlineLobbyScreen` (TASK-323, tarea 6).
##
## A diferencia de las pantallas HTTP (`workshop_screen_test.gd` y
## similares, que levantan un `TCPServer` de verdad para hacer de API
## falsa), aquí NO se monta un servidor Socket.IO falso — el protocolo
## Engine.IO/Socket.IO ya tiene su propia prueba de framing puro
## (`socket_io_protocol_test.gd`), y montar un handshake WebSocket de
## verdad en el arnés para esto es coste sin beneficio claro. En su lugar,
## se simulan las señales que `LiveRaceSocket` emitiría al recibir cada
## evento del servidor, directamente sobre el autoload — lo que se prueba
## es que la pantalla reacciona bien a esas señales y a los botones, no el
## transporte de red (eso lo cubre la verificación manual contra Docker).
##
##     godot --quit-after 600 res://tests/online_lobby_screen_test.tscn

const TestEnv := preload("res://tests/test_env.gd")

var _failures := 0


func _ready() -> void:
	TestEnv.reset()

	await _test_estado_inicial()
	await _test_buscar_pasa_a_buscando()
	await _test_room_update_actualiza_slots()
	await _test_countdown_muestra_cuenta_atras()
	await _test_cancelar_vuelve_a_idle()
	await _test_fallo_de_conexion_vuelve_a_idle()

	# Por si algún test dejó un intento de conexión real colgando (el botón
	# "Buscar partida" sí llama al autoload de verdad, ver comentario de
	# `_test_buscar_pasa_a_buscando`).
	LiveRaceSocket.disconnect_socket()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_estado_inicial() -> void:
	var screen := await _open_screen()

	_check(_find_button(screen, "BUSCAR PARTIDA") != null, true,
		"empieza mostrando el botón de buscar")
	_check(_find_button(screen, "CANCELAR BÚSQUEDA").visible, false,
		"y el de cancelar escondido")

	screen.close_screen()


func _test_buscar_pasa_a_buscando() -> void:
	var screen := await _open_screen()

	# Este SÍ llama al `LiveRaceSocket` real (intenta abrir un WebSocket de
	# verdad) — pero la transición de fase a comprobar es inmediata y
	# síncrona, no depende de que esa conexión llegue a ningún sitio. El
	# `disconnect_socket()` del final de la suite recoge cualquier intento
	# que quede a medias.
	_find_button(screen, "BUSCAR PARTIDA").pressed.emit()

	_check(_find_button(screen, "BUSCAR PARTIDA").visible, false,
		"al buscar, se esconde el botón de buscar")
	_check(_find_button(screen, "CANCELAR BÚSQUEDA").visible, true,
		"y aparece el de cancelar")
	_check(screen._status_label.text.contains("BUSCANDO"), true,
		"y el estado dice que está buscando")

	screen.close_screen()


func _test_room_update_actualiza_slots() -> void:
	var screen := await _open_screen()

	LiveRaceSocket.room_update.emit("room-1", "WAITING_PLAYERS", ["alice", "bot-1"])
	await get_tree().process_frame

	# Ahora los jugadores se reflejan en la columna izquierda, no en un label
	# de "N jugadores". El slot 1 (índice 1) es el primer rival; con 2 ids
	# en la sala, ese slot pasa a "Encontrado".
	_check(screen._player_slots[1].status_label.text, "Encontrado",
		"el segundo slot cambia a 'Encontrado' con dos jugadores en la sala")

	screen.close_screen()


func _test_countdown_muestra_cuenta_atras() -> void:
	var screen := await _open_screen()

	LiveRaceSocket.countdown.emit("room-1", 3000)
	await get_tree().process_frame

	_check(screen._status_label.text.contains("3"), true,
		"la cuenta atrás se ve en el estado")
	_check(_find_button(screen, "CANCELAR BÚSQUEDA").visible, true,
		"y sigue habiendo forma de cancelar durante la cuenta atrás")

	screen.close_screen()


func _test_cancelar_vuelve_a_idle() -> void:
	var screen := await _open_screen()

	_find_button(screen, "BUSCAR PARTIDA").pressed.emit()
	_find_button(screen, "CANCELAR BÚSQUEDA").pressed.emit()

	_check(_find_button(screen, "BUSCAR PARTIDA").visible, true,
		"cancelar devuelve el botón de buscar")
	_check(_find_button(screen, "CANCELAR BÚSQUEDA").visible, false,
		"y esconde el de cancelar")

	screen.close_screen()


func _test_fallo_de_conexion_vuelve_a_idle() -> void:
	var screen := await _open_screen()

	_find_button(screen, "BUSCAR PARTIDA").pressed.emit()
	# `BUSCAR PARTIDA` arranca un intento real de WebSocket que puede fallar
	# en background y colar su propio `connection_failed` (con texto "No se
	# pudo abrir la conexión.") por encima del que emite este test — hacer
	# el corte a mano ANTES del emit deja el estado determinista.
	LiveRaceSocket.disconnect_socket()
	LiveRaceSocket.connection_failed.emit("sin red")
	await get_tree().process_frame

	_check(_find_button(screen, "BUSCAR PARTIDA").visible, true,
		"un fallo de conexión también devuelve al estado inicial")
	_check(screen._status_label.text.contains("SIN RED"), true,
		"con el motivo del fallo a la vista")

	screen.close_screen()


# --- Utilidades ---------------------------------------------------------------

func _open_screen() -> Node:
	# Corta cualquier intento de conexión real que un test anterior haya
	# dejado a medias — aislamiento entre tests, ver comentario de
	# `_test_buscar_pasa_a_buscando`.
	LiveRaceSocket.disconnect_socket()
	var screen: CanvasLayer = load("res://scenes/ui/online-lobby-screen.tscn").instantiate()
	add_child(screen)
	await _settle()
	return screen


func _settle() -> void:
	for i in 5:
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
