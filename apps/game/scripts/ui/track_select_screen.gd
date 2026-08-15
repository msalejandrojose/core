extends CanvasLayer

## Selección de circuito en pantalla completa (rejilla de tarjetas), a partir
## de una captura de referencia. Antes se elegía con una fila de botones
## apretada en la columna derecha del menú — con los circuitos del servidor
## sumándose a la lista (TASK "listar en Jugar todos los circuitos del
## servidor") esa fila ya no cabía cómoda, de ahí esta pantalla aparte.
##
## Selección pendiente, mismo patrón que el arquetipo en el taller: tocar una
## tarjeta solo la resalta, no aplica nada hasta "Confirmar circuito" — así
## se puede mirar la mejor marca de cada una sin comprometerse.
##
## Sin dificultad ni longitud del boceto de referencia: no existen todavía
## como datos reales de un circuito, así que no se simulan. En su lugar se
## muestra lo que sí es real: sectores y tu mejor marca ahí.
##
## Tarjetas claras (`UiTheme.card_panel()`), como el menú y el taller — ver
## comentario sobre el alcance del pase de diseño en `ui_theme.gd`.

const COLUMNS := 4

## Gris neutro del botón "Seleccionar" sin elegir — mismo tono que las
## píldoras de opción del menú y el taller.
const _OPTION_BG := Color("e9e4d9")
## Tono algo más claro que `UiTheme.CARD` para las tarjetas individuales,
## así se distinguen de la tarjeta grande que las contiene a todas.
const _TILE_BG := Color("f4f1ea")

signal closed()
## Solo se emite si se confirma un circuito distinto al que había — quien
## abre esta pantalla lo usa para refrescar su resumen sin tener que sondear
## `GameSettings` por su cuenta.
signal confirmed()

var _grid: GridContainer
var _card_buttons: Array[Button] = []
## Paralelo a `_card_buttons`: el `PanelContainer` de cada tarjeta, para
## poder pintarle el borde de "elegida" en `_sync_selection()`.
var _card_panels: Array[PanelContainer] = []
var _card_ids: Array[String] = []
var _card_is_server: Array[bool] = []

var _pending_id: String
var _pending_is_server: bool


func _ready() -> void:
	layer = 9
	_pending_id = GameSettings.track_id
	_pending_is_server = GameSettings.track_is_server
	_build()


func _build() -> void:
	var backdrop := ColorRect.new()
	# Más claro que antes (0.985 → 0.45): la tarjeta grande de la rejilla
	# flota sobre la escena 3D bien visible, no sobre un fondo casi negro.
	backdrop.color = UiTheme.ink_alpha(0.45)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 56)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 16)
	margin.add_child(column)

	column.add_child(_title("Selección de circuito"))

	var grid_card := UiTheme.card_panel()
	grid_card.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(grid_card)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid_card.add_child(scroll)

	_grid = GridContainer.new()
	_grid.columns = COLUMNS
	_grid.add_theme_constant_override("h_separation", 16)
	_grid.add_theme_constant_override("v_separation", 16)
	scroll.add_child(_grid)

	for id in TrackCatalog.ids():
		var layout := TrackCatalog.by_id(id)
		_add_card(layout.name, id, false, layout.checkpoints + 1)
	_sync_selection()

	# Los del servidor (creados en el backoffice) se cargan aparte y se van
	# añadiendo a la misma rejilla en cuanto llegan — no bloquea el resto de
	# la pantalla, y sin red simplemente no aparece ninguno más que los 4 de
	# fábrica.
	_load_server_tracks()

	var footer := HBoxContainer.new()
	footer.add_theme_constant_override("separation", 16)
	column.add_child(footer)

	var back := UiTheme.pill_button("Atrás", UiTheme.STEEL, Color.WHITE)
	back.pressed.connect(close_screen)
	footer.add_child(back)

	var footer_spacer := Control.new()
	footer_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	footer.add_child(footer_spacer)

	var confirm_button := UiTheme.pill_button("Confirmar circuito", UiTheme.GOOD, Color.WHITE)
	confirm_button.pressed.connect(_confirm)
	footer.add_child(confirm_button)


func close_screen() -> void:
	closed.emit()
	queue_free()


func _confirm() -> void:
	var track_changed := _pending_id != GameSettings.track_id or _pending_is_server != GameSettings.track_is_server
	GameSettings.set_track_id(_pending_id, _pending_is_server)
	if track_changed:
		confirmed.emit()
	close_screen()


## Circuitos creados en el backoffice, además de los 4 del catálogo local. Se
## descartan los que ya representan a uno de los 4 de fábrica (sus slugs
## siempre empiezan por el id local seguido de "-": cilindrada + sentido +
## arquetipo, ver `GameSettings.key_for`) para no duplicar la misma entrada.
func _load_server_tracks() -> void:
	var response = await RacingApi.tracks(100)
	if not is_instance_valid(_grid) or not response.ok or not (response.data is Dictionary):
		return

	var local_ids: Array = TrackCatalog.ids()
	for item in response.data.get("data", []):
		var slug: String = str(item.get("slug", ""))
		if slug == "" or _card_ids.has(slug):
			continue
		var is_local_variant := local_ids.any(func(id: String) -> bool: return slug.begins_with(id + "-"))
		if is_local_variant:
			continue
		_add_card(str(item.get("name", slug)), slug, true, int(item.get("sectorCount", 1)))

	_sync_selection()


func _add_card(label: String, id: String, is_server: bool, sector_count: int) -> void:
	if _card_ids.has(id):
		return

	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(_TILE_BG, 14))
	_grid.add_child(panel)

	var card := VBoxContainer.new()
	card.add_theme_constant_override("separation", 8)
	card.custom_minimum_size = Vector2(300, 0)
	panel.add_child(card)

	var name_label := Label.new()
	name_label.text = label
	name_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	name_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	card.add_child(name_label)

	var sectors_label := Label.new()
	sectors_label.text = "%d sectores" % sector_count
	sectors_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	sectors_label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	card.add_child(sectors_label)

	var best_label := Label.new()
	var key := id if is_server else GameSettings.key_for(id)
	best_label.text = _best_text(key)
	best_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	best_label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	card.add_child(best_label)

	var button := UiTheme.pill_button(
		"Seleccionar", _OPTION_BG, UiTheme.CARD_INK, Vector2(0, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_SM,
		UiTheme.GOOD, Color.WHITE)
	# Sin `ButtonGroup`: la exclusividad la lleva `_sync_selection()` a mano,
	# porque también tiene que apagar el botón de la tarjeta anterior cuando
	# la selección llega de fuera (al abrir la pantalla, o tras cargar los
	# circuitos del servidor).
	button.toggle_mode = true
	button.pressed.connect(func() -> void: _pick(id, is_server))
	card.add_child(button)

	_card_buttons.append(button)
	_card_panels.append(panel)
	_card_ids.append(id)
	_card_is_server.append(is_server)


func _best_text(key: String) -> String:
	if RaceRecords.has_best(key):
		var script := load("res://scripts/ui/race_hud.gd")
		return "Tu mejor: %s" % script.format_ms(RaceRecords.best_ms(key))
	return "Sin marca todavía"


func _pick(id: String, is_server: bool) -> void:
	_pending_id = id
	_pending_is_server = is_server
	_sync_selection()


func _sync_selection() -> void:
	for i in _card_buttons.size():
		var matches := _card_ids[i] == _pending_id and _card_is_server[i] == _pending_is_server
		_card_buttons[i].button_pressed = matches
		_card_buttons[i].text = "Seleccionado" if matches else "Seleccionar"
		var style := UiTheme.card_stylebox_selected(UiTheme.CLAY, _TILE_BG, 14) if matches \
			else UiTheme.card_stylebox(_TILE_BG, 14)
		_card_panels[i].add_theme_stylebox_override("panel", style)


func _title(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label
