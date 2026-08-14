extends CanvasLayer

## Taller: elegir arquetipo de coche (normal/4x4/F1) y equipar piezas (ruedas,
## alerón, chasis), viendo el efecto combinado en velocidad y agarre.
##
## Cada toque guarda al momento contra la API (mismo patrón que Ajustes: sin
## botón "Guardar" aparte) y refresca `CarLoadout` para que el cambio se note
## en la próxima vez que se reconstruya el coche, sin reiniciar la app.
##
## Requiere cuenta: el equipamiento vive en el servidor por jugador
## (`GET/PATCH /racing/cars/me`), así que sin sesión no hay dónde guardarlo.

const BONE := Color("f0ece6")
const INK := Color(0.11, 0.098, 0.09)
const BAD := Color("c4544a")
const CLAY := Color("b4552f")

## category → etiqueta visible, en el orden en que se muestran.
const CATEGORIES := [
	["TIRES", "Ruedas"],
	["WING", "Alerón"],
	["CHASSIS", "Chasis"],
]

signal closed()

var _column: VBoxContainer
var _status: Label
var _stats_label: Label

var _catalog: Dictionary = {}
var _loadout: Dictionary = {}
var _busy: bool = false

var _archetype_buttons: Dictionary = {}
## category (String) → { part_id_or_"" (String): Button }
var _part_buttons: Dictionary = {}
var _all_buttons: Array[Button] = []


func _ready() -> void:
	layer = 9
	_build_shell()

	if not Session.is_logged_in():
		_show_locked()
		return

	await _load()


func _build_shell() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = Color(INK.r, INK.g, INK.b, 0.985)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	_column = VBoxContainer.new()
	_column.add_theme_constant_override("separation", 16)
	margin.add_child(_column)

	_column.add_child(_title("Taller"))

	_status = _label(
		"Por ahora todos los coches compiten en la misma clasificación, "
		+ "sin importar el arquetipo o las piezas — eso cambiará cuando el "
		+ "arquetipo tenga su propia clasificación.", 22)
	_column.add_child(_status)


func _show_locked() -> void:
	_status.text = "Necesitas una cuenta para usar el taller: entra desde \"Cuenta\" en el menú."
	_status.add_theme_color_override("font_color", BAD)

	var row := HBoxContainer.new()
	_column.add_child(row)
	row.add_child(_button("Cerrar", close_screen))


func close_screen() -> void:
	closed.emit()
	queue_free()


# --- Carga y guardado -----------------------------------------------------------

func _load() -> void:
	_status.text = _status.text + "\n\nCargando…"

	var catalog_response = await RacingApi.car_catalog()
	var loadout_response = await RacingApi.car_loadout()

	if not catalog_response.ok or not (catalog_response.data is Dictionary) \
		or not loadout_response.ok or not (loadout_response.data is Dictionary):
		_status.text = "No se pudo cargar el taller. Comprueba la conexión e inténtalo de nuevo."
		_status.add_theme_color_override("font_color", BAD)
		_column.add_child(_button("Cerrar", close_screen))
		return

	_catalog = catalog_response.data
	_loadout = loadout_response.data
	_build_loaded()


## Manda el estado completo (arquetipo + los tres huecos, tal cual quedan
## marcados ahora mismo) y aplica la respuesta. Si falla, se revierte la UI a
## lo último confirmado — un toque no puede dejar la pantalla mintiendo sobre
## qué hay equipado de verdad.
func _save() -> void:
	if _busy:
		return
	_busy = true
	_set_buttons_disabled(true)

	var archetype_id: String = _loadout.get("archetype", {}).get("id", "")
	var tires_id = _selected_part_id("TIRES")
	var wing_id = _selected_part_id("WING")
	var chassis_id = _selected_part_id("CHASSIS")

	var response = await RacingApi.set_car_loadout(archetype_id, tires_id, wing_id, chassis_id)

	_busy = false
	_set_buttons_disabled(false)

	if not response.ok or not (response.data is Dictionary):
		_flash_error(response.message if not response.message.is_empty() else "No se pudo guardar el cambio.")
		_sync_buttons()
		return

	_loadout = response.data
	await CarLoadout.refresh()
	_sync_buttons()
	_refresh_stats()


func _selected_part_id(category: String):
	var current: Variant = _loadout.get(_part_field(category))
	return current.get("id") if current is Dictionary else null


func _part_field(category: String) -> String:
	match category:
		"TIRES": return "tiresPart"
		"WING": return "wingPart"
		_: return "chassisPart"


# --- Construcción tras cargar -----------------------------------------------------

func _build_loaded() -> void:
	_status.text = _status.text.replace("\n\nCargando…", "")

	_stats_label = _label("", 26)
	_stats_label.add_theme_color_override("font_color", CLAY)
	_column.add_child(_stats_label)

	_column.add_child(_heading("Arquetipo"))
	var archetype_row := HBoxContainer.new()
	archetype_row.add_theme_constant_override("separation", 16)
	_column.add_child(archetype_row)

	var archetype_group := ButtonGroup.new()
	for archetype in _catalog.get("archetypes", []):
		var button := _toggle_button(archetype.get("name", archetype.get("code", "?")), archetype_group)
		var id: String = archetype.get("id", "")
		button.pressed.connect(func() -> void: _pick_archetype(id))
		archetype_row.add_child(button)
		_archetype_buttons[id] = button

	for entry in CATEGORIES:
		var category: String = entry[0]
		var label: String = entry[1]

		_column.add_child(_heading(label))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 16)
		_column.add_child(row)

		var group := ButtonGroup.new()
		var buttons: Dictionary = {}

		var none_button := _toggle_button("Ninguna", group)
		none_button.pressed.connect(func() -> void: _pick_part(category, ""))
		row.add_child(none_button)
		buttons[""] = none_button

		for part in _catalog.get("parts", []):
			if part.get("category", "") != category:
				continue
			var button := _toggle_button(part.get("name", part.get("code", "?")), group)
			var id: String = part.get("id", "")
			button.pressed.connect(func() -> void: _pick_part(category, id))
			row.add_child(button)
			buttons[id] = button

		_part_buttons[category] = buttons

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_column.add_child(spacer)

	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 16)
	_column.add_child(bottom)
	bottom.add_child(_button("Cerrar", close_screen))

	_sync_buttons()
	_refresh_stats()


func _pick_archetype(id: String) -> void:
	# Optimista: si el guardado falla, `_save` revierte los botones al volver.
	_loadout["archetype"] = _find(_catalog.get("archetypes", []), id)
	_save()


func _pick_part(category: String, id: String) -> void:
	_loadout[_part_field(category)] = _find(_catalog.get("parts", []), id) if id != "" else null
	_save()


func _find(items: Array, id: String) -> Variant:
	for item in items:
		if item.get("id", "") == id:
			return item
	return null


func _sync_buttons() -> void:
	var archetype_id: String = _loadout.get("archetype", {}).get("id", "")
	for id in _archetype_buttons:
		_archetype_buttons[id].button_pressed = id == archetype_id

	for entry in CATEGORIES:
		var category: String = entry[0]
		var selected = _selected_part_id(category)
		var buttons: Dictionary = _part_buttons.get(category, {})
		for id in buttons:
			buttons[id].button_pressed = id == (selected if selected != null else "")


func _refresh_stats() -> void:
	var stats: Dictionary = _loadout.get("stats", {})
	_stats_label.text = "Velocidad ×%.2f — Agarre ×%.2f" % [
		stats.get("speedScale", 1.0), stats.get("grip", 1.0)]


func _flash_error(message: String) -> void:
	var previous := _status.text
	var previous_color := _status.get_theme_color("font_color")
	_status.text = message
	_status.add_theme_color_override("font_color", BAD)
	await get_tree().create_timer(2.5).timeout
	if is_instance_valid(_status):
		_status.text = previous
		_status.add_theme_color_override("font_color", previous_color)


func _set_buttons_disabled(disabled: bool) -> void:
	for button in _all_buttons:
		button.disabled = disabled


# --- Piezas -----------------------------------------------------------------------

func _title(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 52)
	label.add_theme_color_override("font_color", BONE)
	return label


func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 28)
	label.add_theme_color_override("font_color", BONE)
	return label


func _label(text: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", BONE * Color(1, 1, 1, 0.7))
	return label


func _toggle_button(text: String, group: ButtonGroup) -> Button:
	var button := Button.new()
	button.text = text
	button.toggle_mode = true
	button.button_group = group
	button.custom_minimum_size = Vector2(200, 84)
	button.add_theme_font_size_override("font_size", 26)
	_all_buttons.append(button)
	return button


func _button(text: String, on_pressed: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(240, 96)
	button.add_theme_font_size_override("font_size", 32)
	button.pressed.connect(on_pressed)
	_all_buttons.append(button)
	return button
