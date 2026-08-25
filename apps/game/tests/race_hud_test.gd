extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la celebración de mejora de sector en el HUD (TASK-279):
##
##     godot --headless --quit-after 800 res://tests/race_hud_test.tscn
##
## Hoy el HUD ya mostraba el delta por sector, pero solo como número — sin
## ninguna señal que celebre mejorar un sector aunque la vuelta completa no
## bata el récord. Esto prueba el estado que dispara/apaga esa celebración,
## no el dibujo en sí (`_draw()` no es verificable en este arnés).

var _failures := 0
var _hud: Control


func _ready() -> void:
	TestEnv.reset()

	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var director: RaceDirector = main.get_node("RaceDirector")
	director.set_process(false)
	_hud = main.get_node("RaceHud/Hud")

	_test_mejorar_sector_celebra()
	_test_empeorar_sector_no_celebra()
	_test_sin_referencia_no_celebra()
	_test_la_celebracion_se_apaga_sola()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_mejorar_sector_celebra() -> void:
	_hud._on_sector_delta(0, -350, true)

	_check(_hud._sector_celebrate_left > 0.0, true, "mejorar un sector dispara la celebración")
	_check(_hud._delta_label.text.find("★") != -1, true, "y lo marca en el texto del delta")


func _test_empeorar_sector_no_celebra() -> void:
	_hud._sector_celebrate_left = 0.0
	_hud._on_sector_delta(0, 200, true)

	_check_eq(_hud._sector_celebrate_left, 0.0, "empeorar un sector no celebra nada")
	_check(_hud._delta_label.text.find("★") == -1, true, "y el texto no lleva la estrella")


func _test_sin_referencia_no_celebra() -> void:
	_hud._sector_celebrate_left = 0.0
	_hud._on_sector_delta(0, -500, false)

	_check_eq(_hud._sector_celebrate_left, 0.0, "sin récord contra el que comparar, no hay celebración")


func _test_la_celebracion_se_apaga_sola() -> void:
	_hud._on_sector_delta(0, -100, true)
	_check(_hud._sector_celebrate_left > 0.0, true, "arranca activa")

	_hud._process(_hud.SECTOR_CELEBRATE_HOLD_S + 0.1)
	_check(_hud._sector_celebrate_left <= 0.0, true, "y se apaga sola pasado su tiempo")


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
