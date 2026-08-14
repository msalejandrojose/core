extends CanvasLayer

## Menú principal: hub navegable con una sección por pieza del juego (TASK-256
## /TASK-257) — Jugar, Taller, Grand Prix, Amigos, Clasificaciones — en vez de
## una sola pantalla con todo mezclado en un mismo VBox. Añadir una sección
## nueva es añadir una entrada a `TABS` y un `_build_*_tab()`, no reformar
## esta pantalla otra vez.
##
## Va por encima de la partida, no en una escena aparte, y a propósito: al
## seleccionar un circuito el de detrás se construye de verdad, así que la
## pestaña "Jugar" es también la vista previa. Cambiar de escena obligaría a
## montar la pista dos veces y a perder eso.
##
## El circuito y el sentido viven en la pestaña "Jugar" y no en Ajustes: son
## lo que eliges para jugar, no una preferencia. Ajustes se queda con los
## controles y las licencias.

signal play_pressed()

enum Tab { JUGAR, TALLER, GRAND_PRIX, AMIGOS, CLASIFICACIONES }

const TABS := [
	[Tab.JUGAR, "Jugar"],
	[Tab.TALLER, "Taller"],
	[Tab.GRAND_PRIX, "Grand Prix"],
	[Tab.AMIGOS, "Amigos"],
	[Tab.CLASIFICACIONES, "Clasificaciones"],
]

var _content: VBoxContainer
var _tab_buttons: Dictionary = {}  # Tab (int) -> Button
var _active_tab: int = Tab.JUGAR

## Solo válidos mientras la pestaña "Jugar" está montada: se limpian al
## cambiar de pestaña, igual que el resto de su contenido.
var _best_label: Label
var _account_label: Label
var _track_buttons: Array[Button] = []
var _direction_buttons: Array[Button] = []
var _engine_buttons: Array[Button] = []

## Persistente entre pestañas: vive en la cabecera, no en el contenido.
var _account_button: Button


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
	if _content == null:
		_build()


func open() -> void:
	_ensure_built()
	visible = true
	# Siempre se vuelve a "Jugar": es la pestaña con la que tiene sentido
	# encontrarse al arrancar o al volver de una carrera, y evita arrastrar
	# el estado de otra pestaña que ya no está montada.
	_select_tab(Tab.JUGAR)


func close() -> void:
	visible = false


func _build() -> void:
	var backdrop := ColorRect.new()
	# Menos opaco que Ajustes: aquí interesa entrever el circuito de detrás,
	# que es de lo que va la pestaña "Jugar".
	backdrop.color = UiTheme.ink_alpha(0.88)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 16)
	margin.add_child(column)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 16)
	column.add_child(header)

	var title := Label.new()
	title.text = "Racing"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_DISPLAY)
	title.add_theme_color_override("font_color", UiTheme.CLAY)
	header.add_child(title)

	var push := Control.new()
	push.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(push)

	header.add_child(_icon_button("Ajustes", func() -> void:
		add_child(load("res://scenes/ui/settings-screen.tscn").instantiate())))

	_account_button = _icon_button("Cuenta", _open_account)
	header.add_child(_account_button)

	var tabs_row := HBoxContainer.new()
	tabs_row.add_theme_constant_override("separation", 12)
	column.add_child(tabs_row)

	var tab_group := ButtonGroup.new()
	for entry in TABS:
		var tab: int = entry[0]
		var button := UiTheme.make_button(entry[1], Vector2(0, 88), UiTheme.FONT_SM)
		button.toggle_mode = true
		button.button_group = tab_group
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(func() -> void: _select_tab(tab))
		tabs_row.add_child(button)
		_tab_buttons[tab] = button

	_content = VBoxContainer.new()
	_content.add_theme_constant_override("separation", 12)
	_content.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(_content)


# --- Pestañas -------------------------------------------------------------------

func _select_tab(tab: int) -> void:
	_active_tab = tab
	for t in _tab_buttons:
		_tab_buttons[t].button_pressed = t == tab

	for child in _content.get_children():
		child.free()
	_best_label = null
	_account_label = null
	_track_buttons.clear()
	_direction_buttons.clear()
	_engine_buttons.clear()

	match tab:
		Tab.JUGAR:
			_build_jugar_tab()
		Tab.TALLER:
			_build_launcher_tab(
				"Taller",
				"Elige arquetipo y piezas para tu coche.",
				"res://scenes/ui/workshop-screen.tscn")
		Tab.GRAND_PRIX:
			_build_launcher_tab(
				"Grand Prix",
				"Corre varios circuitos seguidos y compite por la clasificación agregada.",
				"res://scenes/ui/grand-prix-screen.tscn")
		Tab.AMIGOS:
			_build_placeholder_tab(
				"Amigos",
				"Próximamente: añade amigos y compite contra su fantasma.")
		Tab.CLASIFICACIONES:
			_build_placeholder_tab(
				"Clasificaciones",
				"Próximamente: consulta el top de cada circuito desde aquí.")


func _build_jugar_tab() -> void:
	_content.add_child(_heading("Circuito"))

	var tracks := HBoxContainer.new()
	tracks.add_theme_constant_override("separation", 16)
	_content.add_child(tracks)

	var ids: Array = TrackCatalog.ids()
	var track_group := ButtonGroup.new()
	for i in ids.size():
		var layout := TrackCatalog.by_id(ids[i])
		var button := UiTheme.make_button(layout.name, UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM)
		button.toggle_mode = true
		button.button_group = track_group
		var id: String = ids[i]
		button.pressed.connect(func() -> void: _pick_track(id))
		tracks.add_child(button)
		_track_buttons.append(button)

	_content.add_child(_heading("Sentido"))

	var directions := HBoxContainer.new()
	directions.add_theme_constant_override("separation", 16)
	_content.add_child(directions)

	var direction_group := ButtonGroup.new()
	for i in 2:
		var button := UiTheme.make_button("Normal" if i == 0 else "Inverso", UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM)
		button.toggle_mode = true
		button.button_group = direction_group
		var reversed := i == 1
		button.pressed.connect(func() -> void: _pick_direction(reversed))
		directions.add_child(button)
		_direction_buttons.append(button)

	_content.add_child(_heading("Cilindrada"))

	var engines := HBoxContainer.new()
	engines.add_theme_constant_override("separation", 16)
	_content.add_child(engines)

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
	_content.add_child(_best_label)

	_account_label = Label.new()
	_account_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_account_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.55))
	_content.add_child(_account_label)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_content.add_child(spacer)

	var play := UiTheme.make_button("Correr", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_LG)
	play.pressed.connect(func() -> void: play_pressed.emit())
	_content.add_child(play)

	_sync_jugar()


## Taller y Grand Prix ya son pantallas propias completas: la pestaña es solo
## el sitio desde el que se abren, no las reconstruye por dentro.
func _build_launcher_tab(title_text: String, description: String, scene_path: String) -> void:
	_content.add_child(_heading(title_text))
	_content.add_child(_label(description))

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_content.add_child(spacer)

	var open_button := UiTheme.make_button("Abrir")
	open_button.pressed.connect(func() -> void:
		add_child(load(scene_path).instantiate()))
	_content.add_child(open_button)


func _build_placeholder_tab(title_text: String, message: String) -> void:
	_content.add_child(_heading(title_text))
	_content.add_child(_label(message))


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


## Refleja lo que hay guardado. Se llama al construir la pestaña y no solo una
## vez, porque Ajustes puede haber cambiado cosas mientras el menú estaba
## montado en otra pestaña.
func _sync_jugar() -> void:
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
##
## Puede llegar (vía `CarLoadout.changed`) con otra pestaña montada, en cuyo
## caso `_best_label` es null y no hay nada que refrescar.
func _refresh_best() -> void:
	if not is_instance_valid(_best_label):
		return
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


## El botón de cuenta es de cabecera (persistente); la frase de estado solo
## vive en la pestaña "Jugar".
func _refresh_account() -> void:
	if Session.is_logged_in():
		if is_instance_valid(_account_label):
			_account_label.text = "Conectado como %s — tus tiempos se suben." % Session.email
		_account_button.text = "Salir"
	else:
		if is_instance_valid(_account_label):
			_account_label.text = "Juegas sin cuenta. Tus tiempos se guardan aquí; con cuenta salen además en la clasificación."
		_account_button.text = "Entrar"


# --- Piezas -------------------------------------------------------------------

func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.75))
	return label


func _icon_button(text: String, on_pressed: Callable) -> Button:
	var button := UiTheme.make_button(text, Vector2(160, 72), UiTheme.FONT_XS)
	button.pressed.connect(on_pressed)
	return button
