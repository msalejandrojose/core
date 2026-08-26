extends Node

## Prueba del cliente de carrera en vivo (TASK-323, tarea 7): rivales
## dinámicos a partir de `racing-live:snapshot`, atenuado al desconectar, y
## la pantalla de resultado al recibir `race-finished`.
##
## Igual que `online_race_test.gd`: sin servidor real de por medio — las
## señales de `LiveRaceSocket` se simulan directamente sobre el autoload
## (el transporte real ya lo prueba `socket_io_protocol_test.gd`, y la
## verificación manual documentada en la tarea 7 contra Docker con dos
## cuentas de verdad). Aquí se prueba la reacción del `RaceDirector` a esos
## eventos, no la red.
##
##     godot --quit-after 800 res://tests/live_race_client_test.tscn

const TestEnv := preload("res://tests/test_env.gd")

var _failures := 0
var _director: RaceDirector
var _timer: LapTimer


func _ready() -> void:
	TestEnv.reset()
	Session.user_id = "me"

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	_director = main.get_node("RaceDirector")
	_timer = main.get_node("LapTimer")
	_director.set_process(false)
	VehicleInput.locked = false

	await _test_snapshot_de_un_rival_crea_su_fantasma()
	await _test_el_propio_eco_se_ignora()
	await _test_desconexion_atenua_al_rival()
	await _test_race_finished_abre_el_resultado_y_limpia()

	Session.user_id = ""

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _start_live_race() -> void:
	await _director.start_live_race(TrackCatalog.DEFAULT_ID)
	for i in RaceDirector.LIGHT_COUNT + 1:
		_director._process(RaceDirector.LIGHT_INTERVAL_S)


func _test_snapshot_de_un_rival_crea_su_fantasma() -> void:
	await _start_live_race()

	LiveRaceSocket.snapshot_received.emit("room-1", "rival-1", {
		"t": 100, "pos": {"x": 5.0, "y": 0.0, "z": 2.0}, "yaw": 0.3,
	})

	_check(_director._live_rivals.has("rival-1"), true,
		"un snapshot de un rival nuevo crea su fantasma")
	var ghost: Ghost = _director._live_rivals["rival-1"]
	_check(ghost.visible, true, "y se hace visible")

	_director.open_menu()


func _test_el_propio_eco_se_ignora() -> void:
	await _start_live_race()

	LiveRaceSocket.snapshot_received.emit("room-1", "me", {
		"t": 100, "pos": {"x": 1.0, "y": 0.0, "z": 1.0}, "yaw": 0.0,
	})

	_check(_director._live_rivals.has("me"), false,
		"el propio userId no genera un fantasma de rival")

	_director.open_menu()


func _test_desconexion_atenua_al_rival() -> void:
	await _start_live_race()

	LiveRaceSocket.snapshot_received.emit("room-1", "rival-1", {
		"t": 100, "pos": {"x": 0.0, "y": 0.0, "z": 0.0}, "yaw": 0.0,
	})
	var ghost: Ghost = _director._live_rivals["rival-1"]
	var alpha_before: float = ghost._color.a

	LiveRaceSocket.participant_disconnected.emit("room-1", "rival-1")

	_check(ghost._color.a < alpha_before, true,
		"desconectarse atenúa el color del fantasma")
	_check(_director._live_rivals.has("rival-1"), true,
		"pero no lo quita de la sala — se queda congelado en su sitio")

	_director.open_menu()


func _test_race_finished_abre_el_resultado_y_limpia() -> void:
	await _start_live_race()

	LiveRaceSocket.snapshot_received.emit("room-1", "rival-1", {
		"t": 100, "pos": {"x": 0.0, "y": 0.0, "z": 0.0}, "yaw": 0.0,
	})

	LiveRaceSocket.race_finished.emit("room-1", "race-1", [
		{"userId": "me", "durationMs": 40000, "position": 1, "deltaMs": 0, "disconnected": false},
		{"userId": "rival-1", "durationMs": 42000, "position": 2, "deltaMs": 2000, "disconnected": false},
	], [{"userId": "me", "delta": 16}])
	await get_tree().process_frame

	_check(_director._live_race_active, false,
		"race-finished apaga la carrera en vivo")
	_check(_director._live_rivals.is_empty(), true,
		"y limpia todos los fantasmas de rivales")

	# El podio unificado se instancia como `PodiumScreen` (TASK-336 fase 3),
	# ya no como `LiveRaceResultScreen`.
	var screen := _director.get_node_or_null("PodiumScreen")
	_check(screen != null, true, "se abre la pantalla de resultado (podio)")
	if screen != null:
		screen.queue_free()

	_director.open_menu()


# --- Utilidades ---------------------------------------------------------------

func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
