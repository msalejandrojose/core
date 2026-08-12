extends Control

## HUD de carrera. Solo presenta: no decide nada, escucha al RaceDirector.
##
## Colocado arriba a propósito. Abajo a izquierda y derecha están los pulgares
## (ver `touch_controls.gd`), y cualquier cosa que pongas ahí se tapa sola en
## cuanto el jugador agarra el móvil.

const CLAY := Color("b4552f")
const BONE := Color("f0ece6")
const INK := Color(0.11, 0.098, 0.09, 0.72)
const GOOD := Color("4c9a68")
const BAD := Color("c4544a")

## Cuánto se queda en pantalla el delta de un sector.
const DELTA_HOLD_S := 2.0
## Cuánto dura el verde del semáforo tras el GO antes de desaparecer.
const GO_HOLD_S := 1.0

@export var lap_timer_path: NodePath = ^"../../LapTimer"
@export var director_path: NodePath = ^"../../RaceDirector"

var _timer: LapTimer
var _director: RaceDirector

var _time_label: Label
var _best_label: Label
var _delta_label: Label
var _restart_button: Button
var _licenses_button: Button
var _delta_left: float = 0.0

var _lights_on: int = 0
var _lights_total: int = 0
var _go_left: float = 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_timer = get_node(lap_timer_path)
	_director = get_node(director_path)

	_build()

	_director.sector_delta.connect(_on_sector_delta)
	_director.record_beaten.connect(_on_record_beaten)
	_director.restarted.connect(_on_restarted)
	_director.countdown_changed.connect(_on_countdown_changed)
	_director.countdown_finished.connect(_on_countdown_finished)

	# El director arranca su cuenta atrás en su propio `_ready`, que corre antes
	# que el de este nodo, así que la primera señal se pierde. Se lee el total
	# directamente en vez de esperarla.
	_lights_total = RaceDirector.LIGHT_COUNT

	_refresh_best()


func _process(delta: float) -> void:
	_time_label.text = format_ms(_timer.elapsed_ms)

	if _delta_left > 0.0:
		_delta_left -= delta
		if _delta_left <= 0.0:
			_delta_label.text = ""

	if _go_left > 0.0:
		_go_left -= delta
		queue_redraw()


## "1:07.482". Milisegundos siempre a tres cifras: un contrarreloj donde el
## último dígito baila es un contrarreloj en el que no se confía.
static func format_ms(ms: int) -> String:
	var minutes := ms / 60000
	var seconds := (ms % 60000) / 1000
	var millis := ms % 1000
	return "%d:%02d.%03d" % [minutes, seconds, millis]


static func format_delta_ms(ms: int) -> String:
	var sign_text := "+" if ms >= 0 else "-"
	return "%s%d.%03d" % [sign_text, absi(ms) / 1000, absi(ms) % 1000]


# --- Construcción -------------------------------------------------------------

func _build() -> void:
	var safe := _safe_inset()

	_time_label = _make_label(64, BONE)
	_time_label.position = safe + Vector2(48, 40)
	add_child(_time_label)

	_best_label = _make_label(28, BONE * Color(1, 1, 1, 0.65))
	_best_label.position = safe + Vector2(52, 124)
	add_child(_best_label)

	_delta_label = _make_label(48, BONE)
	_delta_label.position = safe + Vector2(48, 176)
	add_child(_delta_label)

	_restart_button = Button.new()
	_restart_button.text = "Reiniciar"
	# 96 px de alto: por encima del mínimo cómodo para un pulgar, y arriba a la
	# derecha, lejos de acelerador y volante.
	_restart_button.custom_minimum_size = Vector2(240, 96)
	_restart_button.anchor_left = 1.0
	_restart_button.anchor_right = 1.0
	_restart_button.offset_left = -288
	_restart_button.offset_top = 40
	_restart_button.offset_right = -48
	_restart_button.offset_bottom = 136
	_restart_button.add_theme_font_size_override("font_size", 32)
	_restart_button.pressed.connect(_director.restart)
	add_child(_restart_button)

	# Aviso MIT de Kenney: obligación de la licencia, no un extra. Vive aquí
	# hasta que exista una pantalla de Ajustes de verdad, que es su sitio.
	_licenses_button = Button.new()
	_licenses_button.text = "Licencias"
	_licenses_button.custom_minimum_size = Vector2(200, 72)
	_licenses_button.anchor_left = 1.0
	_licenses_button.anchor_right = 1.0
	_licenses_button.offset_left = -248
	_licenses_button.offset_top = 152
	_licenses_button.offset_right = -48
	_licenses_button.offset_bottom = 224
	_licenses_button.add_theme_font_size_override("font_size", 26)
	_licenses_button.pressed.connect(open_licenses)
	add_child(_licenses_button)


func open_licenses() -> void:
	add_child(load("res://scenes/ui/licenses-screen.tscn").instantiate())


## Desplazamiento para no quedar bajo el notch o la barra de estado. En
## escritorio el área segura es la ventana entera y esto devuelve cero.
##
## ⚠️ Sin verificar en dispositivo: aquí no hay iPhone ni Android donde el área
## segura sea distinta de la ventana. Comprobarlo en TASK-206/207, al montar los
## pipelines de export, es parte de esas tareas.
func _safe_inset() -> Vector2:
	var window := DisplayServer.window_get_size()
	if window.x <= 0 or window.y <= 0:
		return Vector2.ZERO

	var safe := DisplayServer.get_display_safe_area()
	if safe.size == window and safe.position == Vector2i.ZERO:
		return Vector2.ZERO

	return Vector2(safe.position) * (size / Vector2(window))


## Panel oscuro detrás del texto y contorno del mismo color. Sin esto el HUD
## desaparece sobre el asfalto claro en cuanto da el sol.
func _make_label(font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_outline_color", INK)
	label.add_theme_constant_override("outline_size", maxi(font_size / 6, 4))
	return label


# --- Reacciones ---------------------------------------------------------------

func _on_sector_delta(_checkpoint: int, delta_ms: int, has_reference: bool) -> void:
	if not has_reference:
		_delta_label.text = ""
		return

	_delta_label.text = format_delta_ms(delta_ms)
	_delta_label.add_theme_color_override("font_color", GOOD if delta_ms < 0 else BAD)
	_delta_left = DELTA_HOLD_S


func _on_record_beaten(_duration_ms: int) -> void:
	_refresh_best()
	_delta_label.text = "RÉCORD"
	_delta_label.add_theme_color_override("font_color", CLAY)
	_delta_left = DELTA_HOLD_S


func _on_restarted() -> void:
	_delta_label.text = ""
	_delta_left = 0.0


func _on_countdown_changed(lights_on: int, total: int) -> void:
	_lights_on = lights_on
	_lights_total = total
	_go_left = 0.0
	queue_redraw()


func _on_countdown_finished() -> void:
	_go_left = GO_HOLD_S
	queue_redraw()


# --- Semáforo -----------------------------------------------------------------

## Se dibuja en `_draw` y no con nodos porque son tres círculos que aparecen
## y desaparecen: montar y tirar nodos para esto cuesta más de lo que ahorra.
func _draw() -> void:
	var counting := _director.counting_down
	if not counting and _go_left <= 0.0:
		return

	var radius := size.y * 0.045
	var gap := radius * 2.6
	var center := Vector2(size.x * 0.5, size.y * 0.22)
	var first := center.x - gap * (_lights_total - 1) * 0.5

	# Carcasa oscura detrás: sobre cielo claro unas luces sueltas no se leen.
	var pad := radius * 0.7
	var box := Rect2(
		first - radius - pad, center.y - radius - pad,
		gap * (_lights_total - 1) + radius * 2 + pad * 2, radius * 2 + pad * 2)
	draw_rect(box, INK)

	for i in _lights_total:
		var at := Vector2(first + gap * i, center.y)
		var lit := i < _lights_on
		var color := BONE * Color(1, 1, 1, 0.10)
		if _go_left > 0.0:
			color = GOOD * Color(1, 1, 1, clampf(_go_left / GO_HOLD_S, 0.0, 1.0))
		elif lit:
			color = BAD

		draw_circle(at, radius, color)
		draw_arc(at, radius, 0.0, TAU, 32, BONE * Color(1, 1, 1, 0.35), 3.0, true)



func _refresh_best() -> void:
	if RaceRecords.has_best(_director.track_id):
		_best_label.text = "MEJOR  %s" % format_ms(RaceRecords.best_ms(_director.track_id))
	else:
		_best_label.text = "SIN MARCA"
