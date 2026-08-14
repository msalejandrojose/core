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

var _best_label: Label
var _account_label: Label
var _account_button: Button
var _track_buttons: Array[Button] = []
var _direction_buttons: Array[Button] = []
var _engine_buttons: Array[Button] = []


func _ready() -> void:
	layer = 8
	_ensure_built()
	# La mejor marca depende del arquetipo desde TASK-233: si cambia en el
	# taller (que se abre encima de este menú, sin cerrarlo), el número tiene
	# que refrescarse solo, sin esperar a que se toque circuito/sentido/cc.
	CarLoadout.changed.connect(_refresh_best)


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
	backdrop.color = UiTheme.ink_alpha(0.88)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 12)
	margin.add_child(column)

	var title := Label.new()
	title.text = "Racing"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_DISPLAY)
	title.add_theme_color_override("font_color", UiTheme.CLAY)
	column.add_child(title)

	column.add_child(_heading("Circuito"))

	var tracks := HBoxContainer.new()
	tracks.add_theme_constant_override("separation", 16)
	column.add_child(tracks)

	var ids: Array = TrackCatalog.ids()
	var group := ButtonGroup.new()
	for i in ids.size():
		var layout := TrackCatalog.by_id(ids[i])
		var button := UiTheme.make_button(layout.name, UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM)
		button.toggle_mode = true
		button.button_group = group
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
		var button := UiTheme.make_button("Normal" if i == 0 else "Inverso", UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM)
		button.toggle_mode = true
		button.button_group = direction_group
		var reversed := i == 1
		button.pressed.connect(func() -> void: _pick_direction(reversed))
		directions.add_child(button)
		_direction_buttons.append(button)

	column.add_child(_heading("Cilindrada"))

	var engines := HBoxContainer.new()
	engines.add_theme_constant_override("separation", 16)
	column.add_child(engines)

	var engine_group := ButtonGroup.new()
	for value in [GameSettings.EngineClass.CC50, GameSettings.EngineClass.CC100, GameSettings.EngineClass.CC150]:
		var button := UiTheme.make_button(GameSettings.ENGINE_NAMES[value], UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM)
		button.toggle_mode = true
		button.button_group = engine_group
		var chosen: int = value
		button.pressed.connect(func() -> void: _pick_engine(chosen))
		engines.add_child(button)
		_engine_buttons.append(button)

	_best_label = Label.new()
	_best_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_best_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.7))
	column.add_child(_best_label)

	_account_label = Label.new()
	_account_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_account_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.55))
	column.add_child(_account_label)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(spacer)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	column.add_child(row)

	row.add_child(_button("Ajustes", 240, func() -> void:
		add_child(load("res://scenes/ui/settings-screen.tscn").instantiate())))

	row.add_child(_button("Taller", 240, func() -> void:
		add_child(load("res://scenes/ui/workshop-screen.tscn").instantiate())))

	_account_button = _button("Cuenta", 240, _open_account)
	row.add_child(_account_button)

	var push := Control.new()
	push.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(push)

	var play := _button("Correr", 320, func() -> void: play_pressed.emit())
	play.add_theme_font_size_override("font_size", UiTheme.FONT_LG)
	row.add_child(play)


# --- Estado -------------------------------------------------------------------

func _pick_track(id: String) -> void:
	GameSettings.set_track_id(id)
	_refresh_best()


func _pick_direction(reversed: bool) -> void:
	GameSettings.set_reverse(reversed)
	_refresh_best()


func _pick_engine(value: int) -> void:
	GameSettings.set_engine_class(value)
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

	for i in _engine_buttons.size():
		_engine_buttons[i].button_pressed = i == GameSettings.engine_class

	_refresh_account()
	_refresh_best()


## La mejor marca del circuito Y sentido seleccionados: cada combinación guarda
## la suya, así que el número tiene que cambiar al tocar cualquiera de los dos.
func _refresh_best() -> void:
	var key := GameSettings.track_key()
	if RaceRecords.has_best(key):
		var script := load("res://scripts/ui/race_hud.gd")
		_best_label.text = "Tu mejor vuelta aquí:  %s" % script.format_ms(RaceRecords.best_ms(key))
	else:
		_best_label.text = "Aún no has corrido esta combinación de circuito, sentido y cilindrada."


## Entrar no es obligatorio para jugar: sin cuenta se corre igual y los tiempos
## se guardan en el dispositivo. La cuenta es para que cuenten fuera.
func _open_account() -> void:
	if Session.is_logged_in():
		Session.logout()
		_refresh_account()
		return

	var screen: CanvasLayer = load("res://scenes/ui/login-screen.tscn").instantiate()
	screen.closed.connect(_refresh_account)
	add_child(screen)


func _refresh_account() -> void:
	if Session.is_logged_in():
		_account_label.text = "Conectado como %s — tus tiempos se suben." % Session.email
		_account_button.text = "Salir"
	else:
		_account_label.text = "Juegas sin cuenta. Tus tiempos se guardan aquí; con cuenta salen además en la clasificación."
		_account_button.text = "Entrar"


# --- Piezas -------------------------------------------------------------------

func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _button(text: String, width: int, on_pressed: Callable) -> Button:
	var button := UiTheme.make_button(text, Vector2(width, UiTheme.BUTTON_MIN_SIZE.y))
	button.pressed.connect(on_pressed)
	return button
