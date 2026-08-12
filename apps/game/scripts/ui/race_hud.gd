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

@export var lap_timer_path: NodePath = ^"../../LapTimer"
@export var director_path: NodePath = ^"../../RaceDirector"

var _timer: LapTimer
var _director: RaceDirector

var _time_label: Label
var _best_label: Label
var _delta_label: Label
var _restart_button: Button
var _delta_left: float = 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_timer = get_node(lap_timer_path)
	_director = get_node(director_path)

	_build()

	_director.sector_delta.connect(_on_sector_delta)
	_director.record_beaten.connect(_on_record_beaten)
	_director.restarted.connect(_on_restarted)

	_refresh_best()


func _process(delta: float) -> void:
	_time_label.text = format_ms(_timer.elapsed_ms)

	if _delta_left > 0.0:
		_delta_left -= delta
		if _delta_left <= 0.0:
			_delta_label.text = ""


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


func _refresh_best() -> void:
	if RaceRecords.has_best(_director.track_id):
		_best_label.text = "MEJOR  %s" % format_ms(RaceRecords.best_ms(_director.track_id))
	else:
		_best_label.text = "SIN MARCA"
