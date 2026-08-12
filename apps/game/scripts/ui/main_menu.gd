extends CanvasLayer

## Menú principal: se elige circuito y sentido, y se sale a correr.
##
## Va por encima de la partida, no en una escena aparte, y a propósito: al
## seleccionar un circuito el de detrás se construye de verdad, así que el menú
## es también la vista previa. Cambiar de escena obligaría a montar la pista dos
## veces y a perder eso.
##
## El circuito y el sentido viven aquí y no en Ajustes: son lo que eliges para
## jugar, no una preferencia. Ajustes se queda con los controles y las licencias.

signal play_pressed()

const CLAY := Color("b4552f")
const BONE := Color("f0ece6")
const INK := Color(0.11, 0.098, 0.09)

var _best_label: Label
var _track_buttons: Array[Button] = []
var _direction_buttons: Array[Button] = []


func _ready() -> void:
	layer = 8
	_ensure_built()


## El director abre el menú desde su propio `_ready`, que corre ANTES que el de
## este nodo porque está antes en la escena. Así que la construcción tiene que
## poder dispararse desde cualquiera de los dos, y una sola vez.
func _ensure_built() -> void:
	if _best_label == null:
		_build()


func open() -> void:
	_ensure_built()
	visible = true
	_sync()


func close() -> void:
	visible = false


func _build() -> void:
	var backdrop := ColorRect.new()
	# Menos opaco que Ajustes: aquí interesa entrever el circuito de detrás,
	# que es de lo que va la pantalla.
	backdrop.color = Color(INK.r, INK.g, INK.b, 0.88)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 18)
	margin.add_child(column)

	var title := Label.new()
	title.text = "Racing"
	title.add_theme_font_size_override("font_size", 72)
	title.add_theme_color_override("font_color", CLAY)
	column.add_child(title)

	column.add_child(_heading("Circuito"))

	var tracks := HBoxContainer.new()
	tracks.add_theme_constant_override("separation", 16)
	column.add_child(tracks)

	var ids: Array = TrackCatalog.ids()
	var group := ButtonGroup.new()
	for i in ids.size():
		var layout := TrackCatalog.by_id(ids[i])
		var button := Button.new()
		button.text = layout.name
		button.toggle_mode = true
		button.button_group = group
		button.custom_minimum_size = Vector2(240, 92)
		button.add_theme_font_size_override("font_size", 30)
		var id: String = ids[i]
		button.pressed.connect(func() -> void: _pick_track(id))
		tracks.add_child(button)
		_track_buttons.append(button)

	column.add_child(_heading("Sentido"))

	var directions := HBoxContainer.new()
	directions.add_theme_constant_override("separation", 16)
	column.add_child(directions)

	var direction_group := ButtonGroup.new()
	for i in 2:
		var button := Button.new()
		button.text = "Normal" if i == 0 else "Inverso"
		button.toggle_mode = true
		button.button_group = direction_group
		button.custom_minimum_size = Vector2(240, 92)
		button.add_theme_font_size_override("font_size", 30)
		var reversed := i == 1
		button.pressed.connect(func() -> void: _pick_direction(reversed))
		directions.add_child(button)
		_direction_buttons.append(button)

	_best_label = Label.new()
	_best_label.add_theme_font_size_override("font_size", 28)
	_best_label.add_theme_color_override("font_color", BONE * Color(1, 1, 1, 0.7))
	column.add_child(_best_label)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(spacer)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	column.add_child(row)

	row.add_child(_button("Ajustes", 240, func() -> void:
		add_child(load("res://scenes/ui/settings-screen.tscn").instantiate())))

	var push := Control.new()
	push.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(push)

	var play := _button("Correr", 320, func() -> void: play_pressed.emit())
	play.add_theme_font_size_override("font_size", 40)
	row.add_child(play)


# --- Estado -------------------------------------------------------------------

func _pick_track(id: String) -> void:
	GameSettings.set_track_id(id)
	_refresh_best()


func _pick_direction(reversed: bool) -> void:
	GameSettings.set_reverse(reversed)
	_refresh_best()


## Refleja lo que hay guardado. Se llama al abrir y no solo al construir, porque
## Ajustes puede haber cambiado cosas mientras el menú estaba montado.
func _sync() -> void:
	var ids: Array = TrackCatalog.ids()
	var selected: int = maxi(ids.find(GameSettings.track_id), 0)
	for i in _track_buttons.size():
		_track_buttons[i].button_pressed = i == selected

	for i in _direction_buttons.size():
		_direction_buttons[i].button_pressed = (i == 1) == GameSettings.reverse

	_refresh_best()


## La mejor marca del circuito Y sentido seleccionados: cada combinación guarda
## la suya, así que el número tiene que cambiar al tocar cualquiera de los dos.
func _refresh_best() -> void:
	var key := GameSettings.track_key()
	if RaceRecords.has_best(key):
		var script := load("res://scripts/ui/race_hud.gd")
		_best_label.text = "Tu mejor vuelta aquí:  %s" % script.format_ms(RaceRecords.best_ms(key))
	else:
		_best_label.text = "Aún no has corrido este circuito en este sentido."


# --- Piezas -------------------------------------------------------------------

func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 30)
	label.add_theme_color_override("font_color", BONE)
	return label


func _button(text: String, width: int, on_pressed: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(width, 100)
	button.add_theme_font_size_override("font_size", 32)
	button.pressed.connect(on_pressed)
	return button
