extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del modo Grand Prix en RaceDirector (TASK-250):
##
##     godot --headless --quit-after 800 res://tests/grand_prix_flow_test.tscn
##
## Cubre lo que no se puede ver a simple vista: que arranca el layout que se
## le da (no el del catálogo/menú), que no toca el leaderboard normal al
## cruzar meta, que un cambio de ajustes a mitad no lo pisa, y que volver al
## menú lo deja todo como estaba.

var _failures := 0
var _now: int = 0
var _stage_durations: Array = []
var _records: Array = []
var _deltas: Array = []
var _ended := 0


## Checkpoints y tema distintos del circuito por defecto del menú
## (kenney-01: 3 checkpoints), para poder comprobar que ajustes no lo pisa.
func _gp_layout() -> TrackCatalog.Layout:
	var path: Array[Vector2i] = [
		Vector2i(0, 0), Vector2i(0, 1), Vector2i(0, 2),
		Vector2i(-1, 2), Vector2i(-1, 1), Vector2i(-1, 0),
	]
	return TrackCatalog.Layout.new(
		"gp-stage", "Manga de prueba", path, 5, TrackTheme.Kind.MEADOW, 1.0, {})


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var timer: LapTimer = main.get_node("LapTimer")
	var director: RaceDirector = main.get_node("RaceDirector")

	director.set_process(false)
	VehicleInput.locked = false
	timer.auto_start_on_throttle = false
	director.grand_prix_stage_completed.connect(func(d): _stage_durations.append(d))
	director.record_beaten.connect(func(d): _records.append(d))
	director.sector_delta.connect(func(cp, d, has): _deltas.append([cp, d, has]))
	director.grand_prix_ended.connect(func(): _ended += 1)
	timer.clock = func() -> int: return _now

	_test_arranca_layout_propio(director, timer)
	_test_no_toca_leaderboard_normal(director, timer)
	_test_ajustes_no_pisa_el_layout(director, timer)
	_test_menu_termina_el_modo(director, timer)
	_test_pantalla_sin_sesion()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_arranca_layout_propio(director: RaceDirector, timer: LapTimer) -> void:
	director.start_grand_prix_stage("gp-1", _gp_layout(), false)

	_check(director.in_grand_prix(), true, "arrancar una manga entra en modo Grand Prix")
	_check_eq(timer.sector_count(), 6, "usa el layout de la manga (5 checkpoints + meta), no el del menú")


func _test_no_toca_leaderboard_normal(director: RaceDirector, timer: LapTimer) -> void:
	var key := director.record_key()
	RaceRecords.clear(key)
	_records.clear()
	_stage_durations.clear()
	_deltas.clear()

	timer.start()
	for i in 5:
		_now += 2000
		timer.cross_checkpoint(i)
	_now += 2000
	timer.cross_finish()

	_check_eq(_stage_durations, [12000], "emite grand_prix_stage_completed con el tiempo")
	_check_eq(_records.size(), 0, "no se guarda como récord normal")
	_check(not RaceRecords.has_best(key), true, "el circuito del menú se queda sin marca")
	_check(_deltas[0][2], false, "sin referencia posible: el récord del menú no compara con la manga")


func _test_ajustes_no_pisa_el_layout(director: RaceDirector, timer: LapTimer) -> void:
	GameSettings.set_control_scheme(GameSettings.ControlScheme.TAP)
	GameSettings.set_control_scheme(GameSettings.ControlScheme.WHEEL)

	_check(director.in_grand_prix(), true, "sigue en modo Grand Prix tras cambiar ajustes")
	_check_eq(timer.sector_count(), 6, "el layout de la manga sigue montado")


func _test_menu_termina_el_modo(director: RaceDirector, timer: LapTimer) -> void:
	director.open_menu()

	_check(director.in_grand_prix(), false, "volver al menú sale del modo Grand Prix")
	_check_eq(_ended, 1, "avisa de que el Grand Prix ha terminado")
	_check_eq(timer.sector_count(), 4, "el circuito vuelve a ser el del menú (kenney-01: 3 checkpoints)")


## Solo humo: que la pantalla se instancie sin reventar y detecte que no hay
## sesión, sin llegar a tocar la red (eso es cosa de la pantalla real jugada
## a mano, no de un arnés headless).
func _test_pantalla_sin_sesion() -> void:
	Session.access_token = ""

	var screen: CanvasLayer = load("res://scenes/ui/grand-prix-screen.tscn").instantiate()
	add_child(screen)

	var label: Label = screen._status
	_check(label.text.contains("cuenta"), true, "sin sesión, pide cuenta en vez de listar")

	screen.queue_free()


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
