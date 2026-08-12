extends Node

## Banco de pruebas de los controles táctiles:
##
##     godot res://tests/touch_input_test.tscn
##
## No es un framework de tests: es un arnés para verificar el multitouch sin un
## dispositivo delante. Inyecta eventos por `Viewport.push_input`, así que
## recorre la misma tubería de enrutado que un dedo de verdad.
##
## ⚠️ NO usar `--headless`: sin ventana real el servidor de display reporta un
## tamaño de 0x0 y la transformación del viewport se degenera (los toques
## llegan multiplicados ~30x). Se descubrió depurando esta misma suite.

const TOUCH_CONTROLS := preload("res://scenes/ui/touch-controls.tscn")

var _pad: Control
var _failures := 0


func _ready() -> void:
	var controls := TOUCH_CONTROLS.instantiate()
	add_child(controls)
	_pad = controls.get_node("Pad")

	await _frames(2)
	print("Viewport del pad: %s" % _pad.size)

	await _test_accelerator()
	await _test_brake_wins()
	await _test_steering_full_lock()
	await _test_steer_and_accelerate_together()
	await _test_release_clears_everything()
	await _test_deadzone()
	await _test_origin_follows_thumb()

	if _failures == 0:
		print("\nOK — 7/7")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_accelerator() -> void:
	await _touch(0, _pad.call("_accel_center"), true)
	_expect("acelerador pulsado", VehicleInput.throttle, 1.0)
	await _touch(0, _pad.call("_accel_center"), false)


func _test_brake_wins() -> void:
	await _touch(0, _pad.call("_accel_center"), true)
	await _touch(1, _pad.call("_brake_center"), true)
	_expect("freno gana sobre acelerador", VehicleInput.throttle, -1.0)
	await _touch(0, _pad.call("_accel_center"), false)
	await _touch(1, _pad.call("_brake_center"), false)


func _test_steering_full_lock() -> void:
	var origin := Vector2(_pad.size.x * 0.2, _pad.size.y * 0.7)
	var travel: float = _pad.size.x * _pad.get("STEER_TRAVEL_RATIO")

	await _touch(0, origin, true)
	await _drag(0, origin + Vector2(travel, 0))
	await _frames(40)  # dejar converger el suavizado
	_expect("giro a tope a la derecha", VehicleInput.steer, 1.0, 0.05)

	await _drag(0, origin - Vector2(travel, 0))
	await _frames(40)
	_expect("giro a tope a la izquierda", VehicleInput.steer, -1.0, 0.05)

	await _touch(0, origin, false)


func _test_steer_and_accelerate_together() -> void:
	var origin := Vector2(_pad.size.x * 0.2, _pad.size.y * 0.7)
	var travel: float = _pad.size.x * _pad.get("STEER_TRAVEL_RATIO")

	await _touch(0, origin, true)
	await _touch(1, _pad.call("_accel_center"), true)
	await _drag(0, origin + Vector2(travel, 0))
	await _frames(40)

	_expect("girar y acelerar a la vez (giro)", VehicleInput.steer, 1.0, 0.05)
	_expect("girar y acelerar a la vez (gas)", VehicleInput.throttle, 1.0)

	await _touch(0, origin, false)
	await _touch(1, _pad.call("_accel_center"), false)


func _test_release_clears_everything() -> void:
	await _frames(3)
	_expect("al soltar, giro a cero", VehicleInput.steer, 0.0, 0.001)
	_expect("al soltar, gas a cero", VehicleInput.throttle, 0.0)


func _test_deadzone() -> void:
	var origin := Vector2(_pad.size.x * 0.2, _pad.size.y * 0.7)
	var deadzone: float = _pad.size.x * _pad.get("STEER_DEADZONE_RATIO")

	await _touch(0, origin, true)
	await _drag(0, origin + Vector2(deadzone * 0.5, 0))
	await _frames(20)
	_expect("dentro de la zona muerta no gira", VehicleInput.steer, 0.0, 0.02)
	await _touch(0, origin, false)


func _test_origin_follows_thumb() -> void:
	var origin := Vector2(_pad.size.x * 0.2, _pad.size.y * 0.7)
	var travel: float = _pad.size.x * _pad.get("STEER_TRAVEL_RATIO")

	await _touch(0, origin, true)
	# Pasarse mucho del recorrido: el origen debe seguir al dedo hasta quedar a
	# un recorrido exacto por detrás, es decir en origin + 2*travel.
	await _drag(0, origin + Vector2(travel * 3.0, 0))
	await _frames(40)
	_expect("pasado de tope sigue a fondo", VehicleInput.steer, 1.0, 0.05)

	# Desde ese origen nuevo, retroceder un recorrido completo da giro contrario
	# a tope. Sin el origen móvil aquí habría una banda muerta del tamaño de lo
	# que te hubieras pasado.
	await _drag(0, origin + Vector2(travel, 0))
	await _frames(40)
	_expect("al volver del tope reacciona en el acto", VehicleInput.steer, -1.0, 0.05)

	await _touch(0, origin, false)


# --- Utilidades ---------------------------------------------------------------

## `push_input` recibe coordenadas de VENTANA y les aplica la inversa de
## `get_final_transform()` antes de repartirlas. Como los casos razonan en
## coordenadas del pad (que es lo que ve el código bajo prueba), hay que
## premultiplicar por la transformación directa al inyectar.
##
## Ojo con el sentido: usar `affine_inverse()` aquí escala en la dirección
## contraria y los toques caen aún más lejos, con lo que los pedales no se
## pulsan nunca y el giro parece funcionar sólo porque satura igual.
func _to_window(pos: Vector2) -> Vector2:
	return get_viewport().get_final_transform() * pos


func _touch(index: int, pos: Vector2, pressed: bool) -> void:
	var e := InputEventScreenTouch.new()
	e.index = index
	e.position = _to_window(pos)
	e.pressed = pressed
	get_viewport().push_input(e)
	await _frames(3)


func _drag(index: int, pos: Vector2) -> void:
	var e := InputEventScreenDrag.new()
	e.index = index
	e.position = _to_window(pos)
	get_viewport().push_input(e)
	await _frames(2)


func _frames(n: int) -> void:
	for i in n:
		await get_tree().process_frame


func _expect(label: String, got: float, want: float, tolerance: float = 0.0001) -> void:
	if absf(got - want) <= tolerance:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %.3f, obtenido %.3f" % [label, want, got])
		_failures += 1
