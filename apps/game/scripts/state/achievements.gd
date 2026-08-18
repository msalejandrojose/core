extends Node

## Logros e hitos del jugador (TASK-276): se desbloquean solos jugando, no se
## eligen — y avisan claro al conseguirse.
##
## `RaceRecords` ya emite `record_set` cada vez que se bate una marca propia:
## es el enganche más barato que había para "el jugador progresa", así que el
## primer hito parte de ahí en vez de añadir un contador nuevo. Guardado
## local, igual que `RaceRecords` — el criterio es el mismo: hace falta algo
## que mostrar mucho antes de que exista ningún servidor de logros.
##
## Autoload registrado como `Achievements` en project.godot.

signal unlocked(id: String, title: String)

const PATH := "user://achievements.cfg"
## Cuánto se queda en pantalla el aviso de logro conseguido.
const TOAST_HOLD_S := 3.0

## Orden ascendente a propósito: en cada `record_set` se comprueban todos y
## se desbloquea el que ya esté alcanzado y no lo estuviera antes — no hay
## que perseguir "cuál toca ahora", solo mirar el contador actual.
const DEFINITIONS := [
	{"id": "primera_marca", "title": "Primera marca", "threshold": 1},
	{"id": "cinco_marcas", "title": "5 marcas guardadas", "threshold": 5},
	{"id": "diez_marcas", "title": "10 marcas guardadas", "threshold": 10},
]

var _cfg := ConfigFile.new()

var _toast: CanvasLayer
var _toast_label: Label
var _toast_left: float = 0.0


func _ready() -> void:
	_cfg.load(PATH)
	RaceRecords.record_set.connect(_on_record_set)
	unlocked.connect(_on_unlocked)

	_build_toast()
	set_process(false)


func is_unlocked(id: String) -> bool:
	return _cfg.get_value("unlocked", id, false)


## Solo para tests y para un futuro "borrar mis datos" en ajustes — mismo
## criterio que `RaceRecords.clear()`.
func clear() -> void:
	if _cfg.has_section("unlocked"):
		_cfg.erase_section("unlocked")
		_cfg.save(PATH)


func _on_record_set(_track_id: String, _duration_ms: int) -> void:
	var count := RaceRecords.recorded_count()
	for definition in DEFINITIONS:
		var id: String = definition["id"]
		if count >= int(definition["threshold"]) and not is_unlocked(id):
			_cfg.set_value("unlocked", id, true)
			_cfg.save(PATH)
			unlocked.emit(id, str(definition["title"]))


# --- Aviso ----------------------------------------------------------------------

func _build_toast() -> void:
	_toast = CanvasLayer.new()
	_toast.layer = 15
	_toast.visible = false
	add_child(_toast)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_CENTER_TOP)
	margin.position.y = 96
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_toast.add_child(margin)

	var panel := UiTheme.card_panel(UiTheme.CARD, UiTheme.CARD_CORNER_RADIUS, 24)
	margin.add_child(panel)

	_toast_label = Label.new()
	_toast_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	_toast_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	panel.add_child(_toast_label)


func _on_unlocked(_id: String, title: String) -> void:
	if not is_instance_valid(_toast_label):
		return
	_toast_label.text = "🏆 Logro conseguido: %s" % title
	_toast.visible = true
	_toast_left = TOAST_HOLD_S
	set_process(true)


func _process(delta: float) -> void:
	_toast_left -= delta
	if _toast_left <= 0.0:
		_toast.visible = false
		set_process(false)
