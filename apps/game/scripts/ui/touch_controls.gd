extends Control

## Controles táctiles: dirección analógica con el pulgar izquierdo, acelerador
## y freno con el derecho.
##
## Por qué a mano y no con TouchScreenButton / _gui_input: hacen falta varios
## dedos a la vez (girar mientras aceleras es el caso normal, no la excepción),
## y el enrutado de eventos por nodo se pelea con el multitouch. Aquí se lleva
## un registro explícito de qué índice de dedo controla qué.

# --- Geometría, en fracciones del viewport para que escale por densidad -------

## Recorrido horizontal del pulgar que equivale a giro a tope.
const STEER_TRAVEL_RATIO := 0.14
## Por debajo de esto no se gira: evita que el coche tiemble con el pulso.
const STEER_DEADZONE_RATIO := 0.012
## La mitad izquierda de la pantalla dirige; la derecha son los pedales.
const STEER_ZONE_RATIO := 0.5

const PEDAL_RADIUS_RATIO := 0.075
const PEDAL_MARGIN_RATIO := 0.055

# --- Esquema de toque lateral -------------------------------------------------

## Lo que tarda el giro en llegar a tope al mantener pulsado un lado. Sin rampa
## el volante es un interruptor y el coche va dando bandazos.
const TAP_STEER_RATE := 4.5
## Freno del esquema de toque, en el borde inferior central. Va separado de las
## dos zonas de giro para poder frenar y girar a la vez con dos dedos.
const TAP_BRAKE_RADIUS_RATIO := 0.065
## El freno se dibuja y se detecta algo más pequeño que el acelerador: se usa
## menos y así el pulgar no lo pilla por error al buscar el gas.
const BRAKE_RADIUS_FACTOR := 0.78
## El nitro, igual de pequeño que el freno y separado del gas, para no darle
## sin querer en mitad de una curva.
const NITRO_RADIUS_FACTOR := 0.72

## Suavizado del giro. Alto a propósito: quita el jitter del dedo sin añadir
## retardo perceptible. El coche ya suaviza otra vez en `vehicle.gd`.
const STEER_SMOOTHING := 22.0

# --- Paleta (core-design-system: clay sobre hueso) ----------------------------

const CLAY := Color("b4552f")
const BONE := Color("f0ece6")
const INK := Color(0.11, 0.098, 0.09)

# --- Estado -------------------------------------------------------------------

var _steer_finger := -1
var _steer_origin := Vector2.ZERO
var _steer_point := Vector2.ZERO
var _steer_target := 0.0

## índice de dedo -> "accel" | "brake" | "nitro" (o "left"/"right" en toque)
var _pedal_fingers: Dictionary = {}

## El coche, solo para leer la carga del nitro y dibujarla en su botón. Se
## resuelve tarde porque los controles no dependen de que exista un coche.
@export var vehicle_path: NodePath = ^"../../Vehicle"
var _vehicle: Vehicle


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_process(true)
	_vehicle = get_node_or_null(vehicle_path)


func _process(delta: float) -> void:
	if _is_tap_scheme():
		_process_tap(delta)
		return

	var touching := _steer_finger != -1 or not _pedal_fingers.is_empty()
	VehicleInput.touch_active = touching

	# Durante la cuenta atrás manda el semáforo. Se sigue registrando qué dedos
	# hay puestos, para que al dar el GO el coche salga si ya tenías el gas
	# apretado — que es exactamente lo que hace todo el mundo.
	if VehicleInput.locked:
		queue_redraw()
		return

	if not touching:
		# Al levantar el dedo se suelta todo en el acto. Sin esto el coche
		# arrastra el último giro hasta que el teclado vuelve a mandar.
		_steer_target = 0.0
		VehicleInput.steer = 0.0
		VehicleInput.throttle = 0.0
		queue_redraw()
		return

	VehicleInput.steer = lerpf(VehicleInput.steer, _steer_target, clampf(delta * STEER_SMOOTHING, 0.0, 1.0))

	var accel := false
	var brake := false
	for role in _pedal_fingers.values():
		if role == "accel": accel = true
		elif role == "brake": brake = true

	# El freno gana si están los dos: en un contrarreloj el error caro es no
	# frenar, no perder una décima de aceleración.
	if brake: VehicleInput.throttle = -1.0
	elif accel: VehicleInput.throttle = 1.0
	else: VehicleInput.throttle = 0.0

	VehicleInput.nitro = _pedal_held("nitro")

	queue_redraw()


## Se usa `_input` y no `_unhandled_input` a propósito: con emulate_mouse_from_touch
## activo, el sistema de GUI convierte el toque en evento de ratón y lo marca como
## manejado antes de llegar a la fase unhandled, así que allí no llega nada.
## Verificado en `tests/touch_input_test.gd`.
##
## Como contrapartida, aquí solo se marca el evento como manejado cuando de verdad
## se consume: un toque que no cae en ningún control sigue su camino y podrá ser
## recogido por la UI que venga después (menús, pausa, HUD).
func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		var claimed := _on_press(event.index, event.position) if event.pressed else _on_release(event.index)
		if claimed:
			get_viewport().set_input_as_handled()

	elif event is InputEventScreenDrag:
		if event.index == _steer_finger:
			_update_steer(event.position)
			get_viewport().set_input_as_handled()


# --- Esquema de toque lateral -------------------------------------------------

func _is_tap_scheme() -> bool:
	return GameSettings.control_scheme == GameSettings.ControlScheme.TAP


## Aquí el gas va puesto siempre, así que hay que reclamar el input incluso sin
## dedos en pantalla: si no, el autoload lo sobreescribe con el del teclado y el
## coche se para solo.
func _process_tap(delta: float) -> void:
	VehicleInput.touch_active = true

	if VehicleInput.locked:
		queue_redraw()
		return

	var left := _tap_held("left")
	var right := _tap_held("right")

	var target := 0.0
	if left != right:
		target = -1.0 if left else 1.0

	VehicleInput.steer = move_toward(VehicleInput.steer, target, delta * TAP_STEER_RATE)
	VehicleInput.throttle = -1.0 if _tap_held("brake") else 1.0
	VehicleInput.nitro = _tap_held("nitro")

	queue_redraw()


func _press_tap(index: int, pos: Vector2) -> bool:
	if pos.distance_to(_tap_brake_center()) <= _tap_brake_radius():
		_pedal_fingers[index] = "brake"
		return true

	if pos.distance_to(_tap_nitro_center()) <= _tap_brake_radius():
		_pedal_fingers[index] = "nitro"
		return true

	_pedal_fingers[index] = "left" if pos.x < size.x * 0.5 else "right"
	return true


func _tap_held(role: String) -> bool:
	return _pedal_held(role)


func _tap_brake_radius() -> float:
	return size.x * TAP_BRAKE_RADIUS_RATIO


func _tap_brake_center() -> Vector2:
	return Vector2(size.x * 0.5 - _tap_brake_radius() * 1.4, size.y - size.x * PEDAL_MARGIN_RATIO - _tap_brake_radius())


## Junto al freno, en el centro de abajo. No puede ir en los laterales: ahí
## toda la mitad de la pantalla es el volante.
func _tap_nitro_center() -> Vector2:
	return Vector2(size.x * 0.5 + _tap_brake_radius() * 1.4, size.y - size.x * PEDAL_MARGIN_RATIO - _tap_brake_radius())


# --- Volante flotante ---------------------------------------------------------

func _on_press(index: int, pos: Vector2) -> bool:
	if _is_tap_scheme():
		return _press_tap(index, pos)

	if pos.distance_to(_accel_center()) <= _pedal_radius():
		_pedal_fingers[index] = "accel"
		return true

	if pos.distance_to(_brake_center()) <= _brake_radius():
		_pedal_fingers[index] = "brake"
		return true

	if pos.distance_to(_nitro_center()) <= _nitro_radius():
		_pedal_fingers[index] = "nitro"
		return true

	# Volante flotante: nace donde caiga el pulgar, no en un punto fijo. Evita
	# tener que buscar a ciegas un control dibujado.
	if pos.x < size.x * STEER_ZONE_RATIO and _steer_finger == -1:
		_steer_finger = index
		_steer_origin = pos
		_steer_point = pos
		_steer_target = 0.0
		return true

	return false


func _on_release(index: int) -> bool:
	if index == _steer_finger:
		_steer_finger = -1
		_steer_target = 0.0
		return true

	return _pedal_fingers.erase(index)


func _update_steer(pos: Vector2) -> void:
	_steer_point = pos

	var travel := size.x * STEER_TRAVEL_RATIO
	var offset := pos.x - _steer_origin.x

	# Si el pulgar se pasa del recorrido, el origen le sigue. Sin esto, al
	# volver del tope hay una zona muerta enorme y el coche no reacciona.
	if absf(offset) > travel:
		_steer_origin.x = pos.x - signf(offset) * travel
		offset = signf(offset) * travel

	var deadzone := size.x * STEER_DEADZONE_RATIO
	if absf(offset) < deadzone:
		_steer_target = 0.0
		return

	var usable := travel - deadzone
	_steer_target = clampf((offset - signf(offset) * deadzone) / usable, -1.0, 1.0)


# --- Posiciones de los pedales ------------------------------------------------

func _pedal_radius() -> float:
	return size.x * PEDAL_RADIUS_RATIO


func _brake_radius() -> float:
	return _pedal_radius() * BRAKE_RADIUS_FACTOR


func _nitro_radius() -> float:
	return _pedal_radius() * NITRO_RADIUS_FACTOR


func _accel_center() -> Vector2:
	var m := size.x * PEDAL_MARGIN_RATIO
	return Vector2(size.x - m - _pedal_radius(), size.y - m - _pedal_radius())


func _brake_center() -> Vector2:
	var c := _accel_center()
	return Vector2(c.x - _pedal_radius() * 2.4, c.y - _pedal_radius() * 0.35)


## Encima del acelerador: se llega con el mismo pulgar sin soltar el gas, que
## es justo cuando se usa.
func _nitro_center() -> Vector2:
	var c := _accel_center()
	return Vector2(c.x, c.y - _pedal_radius() * 2.5)


# --- Dibujo -------------------------------------------------------------------

func _draw() -> void:
	if _is_tap_scheme():
		_draw_tap()
		return

	var r := _pedal_radius()

	_draw_pedal(_accel_center(), r, _pedal_held("accel"))
	_draw_pedal(_brake_center(), _brake_radius(), _pedal_held("brake"))
	_draw_nitro(_nitro_center(), _nitro_radius())

	if _steer_finger != -1:
		var travel := size.x * STEER_TRAVEL_RATIO
		var y := _steer_origin.y
		draw_line(Vector2(_steer_origin.x - travel, y), Vector2(_steer_origin.x + travel, y), INK * Color(1, 1, 1, 0.45), 8.0, true)
		draw_line(Vector2(_steer_origin.x - travel, y), Vector2(_steer_origin.x + travel, y), BONE * Color(1, 1, 1, 0.45), 3.0, true)
		draw_circle(Vector2(_steer_point.x, y), r * 0.44, INK * Color(1, 1, 1, 0.55))
		draw_circle(Vector2(_steer_point.x, y), r * 0.36, CLAY)


## Fondo oscuro + borde claro. Un pedal dibujado solo en tono claro se
## desvanece sobre la hierba y el asfalto claro del circuito: se comprobó en
## captura, no se dedujo.
func _draw_pedal(center: Vector2, radius: float, held: bool) -> void:
	draw_circle(center, radius, INK * Color(1, 1, 1, 0.75 if held else 0.45))
	var edge := CLAY if held else BONE
	draw_circle(center, radius * 0.82, edge * Color(1, 1, 1, 0.35 if held else 0.16))
	draw_arc(center, radius, 0.0, TAU, 48, edge, 4.0, true)


## El propio botón es el indicador: el arco exterior marca lo que queda. Un
## medidor en otra esquina obligaría a apartar la vista de la pista justo
## cuando vas más rápido.
func _draw_nitro(center: Vector2, radius: float) -> void:
	var charge := _vehicle.nitro_charge if _vehicle != null else 1.0
	var firing := _vehicle != null and _vehicle.nitro_active
	var ready := charge >= Vehicle.NITRO_MIN_CHARGE

	draw_circle(center, radius, INK * Color(1, 1, 1, 0.75 if firing else 0.45))

	# Apagado cuando no queda: pulsar y que no pase nada sin explicación es
	# peor que ver que no está disponible.
	var edge := CLAY if firing else (BONE if ready else BONE * Color(1, 1, 1, 0.35))
	# El aro de fondo va muy apagado para que lo que se lea de un vistazo sea
	# cuánto queda, no dónde está el botón.
	draw_arc(center, radius, 0.0, TAU, 40, edge * Color(1, 1, 1, 0.18), 4.0, true)
	if charge > 0.0:
		draw_arc(center, radius, -PI / 2, -PI / 2 + TAU * charge, 40, edge, 8.0, true)

	# Rayo: dos triángulos que comparten el quiebro.
	var h := radius * 0.46
	var w := radius * 0.26
	var ink := edge * Color(1, 1, 1, 0.95 if firing else 0.8)
	draw_colored_polygon(PackedVector2Array([
		center + Vector2(w * 0.35, -h),
		center + Vector2(-w, h * 0.1),
		center + Vector2(w * 0.05, h * 0.1),
	]), ink)
	draw_colored_polygon(PackedVector2Array([
		center + Vector2(-w * 0.35, h),
		center + Vector2(w, -h * 0.1),
		center + Vector2(-w * 0.05, -h * 0.1),
	]), ink)


func _pedal_held(role: String) -> bool:
	for r in _pedal_fingers.values():
		if r == role: return true
	return false


## Dos flechas en los laterales y el freno abajo en el centro. Las flechas se
## dibujan aunque no las estés tocando: en este esquema toda la mitad de la
## pantalla es el control, y sin nada dibujado no hay forma de adivinarlo.
func _draw_tap() -> void:
	var r := _pedal_radius()
	var y := size.y * 0.62

	_draw_arrow(Vector2(size.x * 0.11, y), r, -1.0, _tap_held("left"))
	_draw_arrow(Vector2(size.x * 0.89, y), r, 1.0, _tap_held("right"))

	var brake_r := _tap_brake_radius()
	var held := _tap_held("brake")
	draw_circle(_tap_brake_center(), brake_r, INK * Color(1, 1, 1, 0.75 if held else 0.45))
	draw_arc(_tap_brake_center(), brake_r, 0.0, TAU, 40, CLAY if held else BONE, 4.0, true)
	# Barra: el símbolo universal de "para".
	var bar := Vector2(brake_r * 0.42, brake_r * 0.12)
	draw_rect(Rect2(_tap_brake_center() - bar, bar * 2.0), (CLAY if held else BONE) * Color(1, 1, 1, 0.9))

	_draw_nitro(_tap_nitro_center(), brake_r)


func _draw_arrow(center: Vector2, radius: float, direction: float, held: bool) -> void:
	draw_circle(center, radius, INK * Color(1, 1, 1, 0.75 if held else 0.40))

	var edge := CLAY if held else BONE
	draw_arc(center, radius, 0.0, TAU, 48, edge, 4.0, true)

	var tip := center + Vector2(direction * radius * 0.42, 0.0)
	var back := center - Vector2(direction * radius * 0.22, 0.0)
	draw_colored_polygon(PackedVector2Array([
		tip,
		back + Vector2(0.0, -radius * 0.38),
		back + Vector2(0.0, radius * 0.38),
	]), edge * Color(1, 1, 1, 0.95 if held else 0.75))
