extends Control

## HUD de carrera. Solo presenta: no decide nada, escucha al RaceDirector.
##
## Colocado arriba a propósito. Abajo a izquierda y derecha están los pulgares
## (ver `touch_controls.gd`), y cualquier cosa que pongas ahí se tapa sola en
## cuanto el jugador agarra el móvil.

## Cuánto se queda en pantalla el delta de un sector.
const DELTA_HOLD_S := 2.0
## Cuánto dura el verde del semáforo tras el GO antes de desaparecer.
const GO_HOLD_S := 1.0

## Tamaños propios del HUD, más grandes que la escala de UiTheme a propósito:
## son los números que se leen de reojo mientras conduces, no texto de menú.
const FONT_TIME := 64
const FONT_DELTA := 48

@export var lap_timer_path: NodePath = ^"../../LapTimer"
@export var director_path: NodePath = ^"../../RaceDirector"

var _timer: LapTimer
var _director: RaceDirector

var _time_label: Label
var _best_label: Label
var _delta_label: Label
## Solo visible durante un contrarreloj de 3 vueltas (TASK-312): "Vuelta 2/3".
var _lap_counter_label: Label
var _restart_button: Button
var _settings_button: Button
var _menu_button: Button
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
	_director.lap_finished.connect(_on_lap_finished)
	_director.time_trial_started.connect(_on_time_trial_started)
	_director.time_trial_lap_completed.connect(_on_time_trial_lap_completed)
	_director.time_trial_finished.connect(_on_time_trial_finished)

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

	_time_label = _make_label(FONT_TIME, UiTheme.BONE)
	_time_label.position = safe + Vector2(48, 40)
	add_child(_time_label)

	_best_label = _make_label(UiTheme.FONT_SM, UiTheme.BONE * Color(1, 1, 1, 0.65))
	_best_label.position = safe + Vector2(52, 124)
	add_child(_best_label)

	_lap_counter_label = _make_label(UiTheme.FONT_SM, UiTheme.CLAY)
	_lap_counter_label.position = safe + Vector2(52, 124)
	_lap_counter_label.visible = false
	add_child(_lap_counter_label)

	_delta_label = _make_label(FONT_DELTA, UiTheme.BONE)
	_delta_label.position = safe + Vector2(48, 176)
	add_child(_delta_label)

	# 112 px de alto: el tamaño táctil de UiTheme, arriba a la derecha, lejos
	# de acelerador y volante.
	_restart_button = UiTheme.make_button("Reiniciar", Vector2(240, 112), UiTheme.FONT_MD)
	_restart_button.anchor_left = 1.0
	_restart_button.anchor_right = 1.0
	_restart_button.offset_left = -288
	_restart_button.offset_top = 40
	_restart_button.offset_right = -48
	_restart_button.offset_bottom = 152
	_restart_button.pressed.connect(_director.restart)
	add_child(_restart_button)

	# Las licencias viven dentro de Ajustes, que es su sitio según el SPEC.
	_settings_button = UiTheme.make_button("Ajustes", Vector2(200, 88), UiTheme.FONT_SM)
	_settings_button.anchor_left = 1.0
	_settings_button.anchor_right = 1.0
	_settings_button.offset_left = -248
	_settings_button.offset_top = 168
	_settings_button.offset_right = -48
	_settings_button.offset_bottom = 256
	_settings_button.pressed.connect(open_settings)
	add_child(_settings_button)

	# Volver a elegir circuito sin salir de la app.
	_menu_button = UiTheme.make_button("Menú", Vector2(200, 88), UiTheme.FONT_SM)
	_menu_button.anchor_left = 1.0
	_menu_button.anchor_right = 1.0
	_menu_button.offset_left = -248
	_menu_button.offset_top = 272
	_menu_button.offset_right = -48
	_menu_button.offset_bottom = 360
	_menu_button.pressed.connect(_director.open_menu)
	add_child(_menu_button)


func open_settings() -> void:
	add_child(load("res://scenes/ui/settings-screen.tscn").instantiate())


## Resumen al completar una vuelta en solitario (TASK-260). Vive aquí y no en
## el director: el HUD ya es quien instancia pantallas (Ajustes), el director
## solo avisa de que ha pasado algo.
func _on_lap_finished(duration_ms: int, previous_best_ms: Variant, is_new_record: bool) -> void:
	var screen: CanvasLayer = load("res://scenes/ui/race-result-screen.tscn").instantiate()
	add_child(screen)
	screen.show_result(duration_ms, previous_best_ms, is_new_record)


## Contrarreloj de 3 vueltas (TASK-312): el contador de vuelta ocupa el mismo
## hueco que "MEJOR ..." — no tiene sentido enseñar los dos a la vez, la
## mejor marca es de la vuelta suelta y este modo no la toca.
func _on_time_trial_started() -> void:
	# La visibilidad la resincroniza `_on_restarted()`, que dispara justo
	# después (`start_time_trial()` llama a `restart()` por dentro) — aquí
	# solo hace falta el texto de la primera vuelta.
	_lap_counter_label.text = "Vuelta 1/%d" % RaceDirector.TIME_TRIAL_LAPS


func _on_time_trial_lap_completed(lap_number: int, _duration_ms: int, _total_ms: int) -> void:
	_lap_counter_label.text = "Vuelta %d/%d" % [lap_number + 1, RaceDirector.TIME_TRIAL_LAPS]


func _on_time_trial_finished(total_ms: int, lap_times_ms: Array) -> void:
	_best_label.visible = true
	_lap_counter_label.visible = false

	var screen: CanvasLayer = load("res://scenes/ui/time-trial-result-screen.tscn").instantiate()
	add_child(screen)
	screen.show_result(total_ms, lap_times_ms)


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
	label.add_theme_color_override("font_outline_color", UiTheme.ink_alpha(0.72))
	label.add_theme_constant_override("outline_size", maxi(font_size / 6, 4))
	return label


# --- Reacciones ---------------------------------------------------------------

func _on_sector_delta(_checkpoint: int, delta_ms: int, has_reference: bool) -> void:
	if not has_reference:
		_delta_label.text = ""
		return

	_delta_label.text = format_delta_ms(delta_ms)
	_delta_label.add_theme_color_override("font_color", UiTheme.GOOD if delta_ms < 0 else UiTheme.BAD)
	_delta_left = DELTA_HOLD_S


func _on_record_beaten(_duration_ms: int) -> void:
	_refresh_best()
	_delta_label.text = "RÉCORD"
	_delta_label.add_theme_color_override("font_color", UiTheme.CLAY)
	_delta_left = DELTA_HOLD_S


func _on_restarted() -> void:
	_delta_label.text = ""
	_delta_left = 0.0

	# `restart()` es el punto de paso de TODA salida (vuelta suelta, manga de
	# Grand Prix, cada vuelta del contrarreloj) — resincroniza aquí y no solo
	# en `_on_time_trial_started()`/`_on_time_trial_finished()`: si se
	# abandona un contrarreloj por el botón "Menú" (sin pasar por
	# `time_trial_finished`) y luego se arranca una vuelta suelta, esta es la
	# única señal común a las dos que dispara antes de que el jugador vea el
	# HUD de nuevo.
	var in_time_trial := _director.in_time_trial()
	_lap_counter_label.visible = in_time_trial
	_best_label.visible = not in_time_trial


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
	draw_rect(box, UiTheme.ink_alpha(0.72))

	for i in _lights_total:
		var at := Vector2(first + gap * i, center.y)
		var lit := i < _lights_on
		var color := UiTheme.BONE * Color(1, 1, 1, 0.10)
		if _go_left > 0.0:
			color = UiTheme.GOOD * Color(1, 1, 1, clampf(_go_left / GO_HOLD_S, 0.0, 1.0))
		elif lit:
			color = UiTheme.BAD

		draw_circle(at, radius, color)
		draw_arc(at, radius, 0.0, TAU, 32, UiTheme.BONE * Color(1, 1, 1, 0.35), 3.0, true)



func _refresh_best() -> void:
	var key := _director.record_key()
	if RaceRecords.has_best(key):
		_best_label.text = "MEJOR  %s" % format_ms(RaceRecords.best_ms(key))
	else:
		_best_label.text = "SIN MARCA"
