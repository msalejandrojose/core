extends CanvasLayer

## Clasificaciones (TASK-290), del circuito y cilindrada ya elegidos en el
## menú principal — mundial o acotada a amigos, con un botón "píldora" para
## alternar. Antes vivía dentro de `main_menu.gd` como una pestaña más; con
## el rediseño de la pantalla principal (segunda captura de referencia) ya
## no hay pestañas con contenido propio, así que esto pasa a ser una
## pantalla suelta que se abre desde la cabecera, mismo patrón que
## `friends-screen.tscn`.

var _column: VBoxContainer
var _status: Label
var _container: VBoxContainer


func _ready() -> void:
	layer = 9
	_build()
	_load(false)


func _build() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = UiTheme.ink_alpha(0.45)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	var card := UiTheme.card_panel()
	card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(card)

	_column = VBoxContainer.new()
	_column.add_theme_constant_override("separation", 12)
	card.add_child(_column)

	_column.add_child(_heading("Clasificaciones"))
	_column.add_child(_label(
		"Del circuito y cilindrada elegidos en el menú principal."))

	var toggle := HBoxContainer.new()
	toggle.add_theme_constant_override("separation", 16)
	_column.add_child(toggle)

	var mode_group := ButtonGroup.new()
	var global_button := UiTheme.pill_button(
		"Global", Color("e9e4d9"), UiTheme.CARD_INK, UiTheme.BUTTON_MIN_SIZE,
		UiTheme.FONT_SM, UiTheme.GOOD, Color.WHITE)
	global_button.toggle_mode = true
	global_button.button_group = mode_group
	global_button.button_pressed = true
	global_button.pressed.connect(func() -> void: _load(false))
	toggle.add_child(global_button)

	# "Solo amigos" y no "Amigos": ya hay un acceso de cabecera con ese
	# nombre — mismo texto en dos botones visibles a la vez confunde tanto
	# al jugador como a cualquier búsqueda por texto.
	var friends_button := UiTheme.pill_button(
		"Solo amigos", Color("e9e4d9"), UiTheme.CARD_INK, UiTheme.BUTTON_MIN_SIZE,
		UiTheme.FONT_SM, UiTheme.GOOD, Color.WHITE)
	friends_button.toggle_mode = true
	friends_button.button_group = mode_group
	friends_button.pressed.connect(func() -> void: _load(true))
	toggle.add_child(friends_button)

	_status = _label("Cargando…")
	_column.add_child(_status)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_column.add_child(scroll)

	_container = VBoxContainer.new()
	_container.add_theme_constant_override("separation", 8)
	_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_container)

	var footer := HBoxContainer.new()
	_column.add_child(footer)
	var footer_spacer := Control.new()
	footer_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(footer_spacer)
	var close_button := UiTheme.pill_button("Cerrar", UiTheme.STEEL, Color.WHITE)
	close_button.pressed.connect(close_screen)
	footer.add_child(close_button)


func close_screen() -> void:
	queue_free()


func _load(friends_only: bool) -> void:
	if not is_instance_valid(_status):
		return

	for child in _container.get_children():
		child.free()

	# Mismo requisito que el resto del leaderboard (`race_result_screen.gd`):
	# sin sesión no hay con quién identificar ni una posición ni una lista de
	# amigos.
	if not Session.is_logged_in():
		_status.text = "Necesitas una cuenta para ver clasificaciones."
		return

	_status.text = "Cargando…"

	var key := GameSettings.track_key()
	var response = (
		await RacingApi.friends_leaderboard(key) if friends_only
		else await RacingApi.leaderboard(key, 20))

	# La pantalla pudo cerrarse mientras esperábamos la respuesta.
	if not is_instance_valid(_status):
		return

	if not response.ok or not (response.data is Dictionary):
		_status.text = "No se pudo cargar la clasificación."
		return

	var entries: Array = response.data.get("entries", [])
	if entries.is_empty():
		_status.text = (
			"Ninguno de tus amigos tiene marca en este circuito todavía." if friends_only
			else "Todavía no hay marcas en este circuito.")
		return

	_status.text = ""
	var hud_script := load("res://scripts/ui/race_hud.gd")
	for entry in entries:
		_container.add_child(_row(entry, hud_script))


func _row(entry: Dictionary, hud_script: Script) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)

	var position_label := _label("#%d" % int(entry.get("position", 0)))
	position_label.custom_minimum_size = Vector2(56, 0)
	row.add_child(position_label)

	var name_label := _label(str(entry.get("displayName", "?")))
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_label)

	row.add_child(_label(hud_script.format_ms(int(entry.get("durationMs", 0)))))

	return row


func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	return label


func _label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	return label
