extends CanvasLayer

## Taller: elegir arquetipo de coche (normal/4x4/F1) y equipar piezas (ruedas,
## alerón, chasis), viendo el efecto combinado en velocidad y agarre y una
## vista 3D en vivo del coche elegido.
##
## Cada toque guarda al momento contra la API (mismo patrón que Ajustes: sin
## botón "Guardar" aparte) y refresca `CarLoadout` para que el cambio se note
## en la próxima vez que se reconstruya el coche, sin reiniciar la app. La
## única excepción es el arquetipo: la lista de variantes solo PREVISUALIZA
## (vista 3D + resaltado) hasta que se pulsa "Cambiar", para poder mirar las
## tres sin comprometerse ni gastar una llamada a la API por cada vistazo.
##
## Requiere cuenta: el equipamiento vive en el servidor por jugador
## (`GET/PATCH /racing/cars/me`), así que sin sesión no hay dónde guardarlo.

## category → etiqueta visible, en el orden en que se muestran.
const CATEGORIES := [
	["TIRES", "Ruedas"],
	["WING", "Alerón"],
	["CHASSIS", "Chasis"],
]

## Rango de la barra de rendimiento. Los arquetipos y piezas actuales se
## mueven en ese entorno alrededor de 1.0× — no hay un máximo teórico real,
## así que la barra se satura en vez de intentar acertar un tope exacto.
const STAT_BAR_MIN := 0.5
const STAT_BAR_MAX := 1.5

## Cuánto gira la vista previa por segundo (rad). Lento a propósito: es para
## verse el coche desde todos los lados sin marear.
const PREVIEW_SPIN_SPEED := 0.6

signal closed()

var _root: VBoxContainer
var _status: Label
var _body: HBoxContainer

var _variants_list: VBoxContainer
var _change_button: Button

var _preview_viewport: SubViewport
var _preview_pivot: Node3D
var _preview_model: Node

var _speed_bar: ProgressBar
var _grip_bar: ProgressBar
var _offroad_bar: ProgressBar
var _stats_label: Label

var _catalog: Dictionary = {}
var _loadout: Dictionary = {}
var _busy: bool = false

## Arquetipo que se está enseñando en la vista 3D ahora mismo — puede no ser
## todavía el que está aplicado de verdad (`_loadout.archetype`) hasta que se
## confirme con "Cambiar".
var _pending_archetype_id: String = ""

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


func _process(delta: float) -> void:
	if _preview_pivot != null:
		_preview_pivot.rotate_y(delta * PREVIEW_SPIN_SPEED)


func _build_shell() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = UiTheme.ink_alpha(0.985)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 56)
	add_child(margin)

	_root = VBoxContainer.new()
	_root.add_theme_constant_override("separation", 16)
	margin.add_child(_root)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 16)
	_root.add_child(header)
	header.add_child(_title("Taller"))
	var header_spacer := Control.new()
	header_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(header_spacer)
	header.add_child(_button("Cerrar", close_screen))

	_status = _label(
		"Por ahora todos los coches compiten en la misma clasificación, "
		+ "sin importar el arquetipo o las piezas — eso cambiará cuando el "
		+ "arquetipo tenga su propia clasificación.", UiTheme.FONT_XS)
	_root.add_child(_status)


func _show_locked() -> void:
	_status.text = "Necesitas una cuenta para usar el taller: entra desde \"Cuenta\" en el menú."
	_status.add_theme_color_override("font_color", UiTheme.BAD)


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
		_status.add_theme_color_override("font_color", UiTheme.BAD)
		return

	_catalog = catalog_response.data
	_loadout = loadout_response.data
	_pending_archetype_id = _loadout.get("archetype", {}).get("id", "")
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
		_pending_archetype_id = _loadout.get("archetype", {}).get("id", "")
		_sync_buttons()
		_show_preview(_pending_archetype_id)
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

	_body = HBoxContainer.new()
	_body.add_theme_constant_override("separation", 24)
	_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root.add_child(_body)

	_body.add_child(_build_variants_panel())
	_body.add_child(_build_preview_panel())
	_body.add_child(_build_upgrades_panel())

	_sync_buttons()
	_refresh_stats()
	_show_preview(_pending_archetype_id)


## Columna izquierda ("VARIANTES DISPONIBLES" del boceto): lista vertical de
## arquetipos. Elegir uno solo cambia la vista previa — hace falta pulsar
## "Cambiar" para que se aplique de verdad y se guarde.
func _build_variants_panel() -> Control:
	var panel := VBoxContainer.new()
	panel.custom_minimum_size = Vector2(300, 0)
	panel.add_theme_constant_override("separation", 12)

	panel.add_child(_heading("Variantes disponibles"))

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(scroll)

	_variants_list = VBoxContainer.new()
	_variants_list.add_theme_constant_override("separation", 8)
	_variants_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_variants_list)

	var archetype_group := ButtonGroup.new()
	for archetype in _catalog.get("archetypes", []):
		var button := _toggle_button(archetype.get("name", archetype.get("code", "?")), archetype_group)
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		var id: String = archetype.get("id", "")
		button.pressed.connect(func() -> void: _preview_archetype(id))
		_variants_list.add_child(button)
		_archetype_buttons[id] = button

	_change_button = _button("Cambiar", _confirm_archetype)
	_change_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.add_child(_change_button)

	return panel


## Columna central: vista 3D en vivo del arquetipo resaltado en la lista,
## girando despacio (mismos modelos que monta `RaceDirector` en carrera —
## `RaceDirector.ARCHETYPE_MODELS` es la única fuente de esa tabla).
func _build_preview_panel() -> Control:
	var panel := VBoxContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var viewport_container := SubViewportContainer.new()
	viewport_container.stretch = true
	viewport_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	viewport_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(viewport_container)

	_preview_viewport = SubViewport.new()
	_preview_viewport.size = Vector2i(640, 640)
	_preview_viewport.transparent_bg = true
	_preview_viewport.own_world_3d = true
	viewport_container.add_child(_preview_viewport)

	var camera := Camera3D.new()
	# `look_at_from_position`, no `position` + `look_at`: este nodo todavía no
	# está dentro del árbol en este punto (el panel se añade a `_body`
	# después de construirse entero) y `look_at` necesita `global_transform`.
	camera.look_at_from_position(Vector3(0, 2.3, 4.4), Vector3(0, 0.4, 0), Vector3.UP)
	_preview_viewport.add_child(camera)

	var key_light := DirectionalLight3D.new()
	key_light.rotation_degrees = Vector3(-50, -30, 0)
	_preview_viewport.add_child(key_light)

	var fill_light := DirectionalLight3D.new()
	fill_light.rotation_degrees = Vector3(-30, 150, 0)
	fill_light.light_energy = 0.35
	_preview_viewport.add_child(fill_light)

	_preview_pivot = Node3D.new()
	_preview_viewport.add_child(_preview_pivot)

	return panel


## Columna derecha ("ACCESORIOS Y MEJORAS" del boceto), sin la parte de
## accesorios decorativos (madera, herramientas…) porque esa aún no existe
## como sistema real — solo lo que ya está implementado: rendimiento del
## arquetipo elegido y las piezas equipables (ruedas/alerón/chasis).
func _build_upgrades_panel() -> Control:
	var panel := VBoxContainer.new()
	panel.custom_minimum_size = Vector2(360, 0)
	panel.add_theme_constant_override("separation", 12)

	panel.add_child(_heading("Rendimiento"))
	_speed_bar = _stat_bar()
	panel.add_child(_stat_row("Velocidad", _speed_bar))
	_grip_bar = _stat_bar()
	panel.add_child(_stat_row("Agarre", _grip_bar))
	_offroad_bar = _stat_bar()
	panel.add_child(_stat_row("Fuera de asfalto", _offroad_bar))

	_stats_label = _label("", UiTheme.FONT_XS)
	panel.add_child(_stats_label)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(scroll)

	var parts_column := VBoxContainer.new()
	parts_column.add_theme_constant_override("separation", 12)
	scroll.add_child(parts_column)

	for entry in CATEGORIES:
		var category: String = entry[0]
		var label: String = entry[1]

		parts_column.add_child(_heading(label))
		var row := HFlowContainer.new()
		row.add_theme_constant_override("h_separation", 12)
		row.add_theme_constant_override("v_separation", 12)
		parts_column.add_child(row)

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

	return panel


func _stat_row(label: String, bar: ProgressBar) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	var text := _label(label, UiTheme.FONT_XS)
	text.custom_minimum_size = Vector2(140, 0)
	row.add_child(text)
	row.add_child(bar)
	return row


func _stat_bar() -> ProgressBar:
	var bar := ProgressBar.new()
	bar.min_value = STAT_BAR_MIN
	bar.max_value = STAT_BAR_MAX
	bar.show_percentage = false
	bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bar.custom_minimum_size = Vector2(0, 24)
	return bar


## Solo cambia lo que se ve (lista resaltada + coche 3D): no guarda nada
## todavía, para poder mirar las variantes sin gastar una llamada por cada
## vistazo.
func _preview_archetype(id: String) -> void:
	_pending_archetype_id = id
	_sync_buttons()
	_show_preview(id)


func _confirm_archetype() -> void:
	var committed_id: String = _loadout.get("archetype", {}).get("id", "")
	if _pending_archetype_id == committed_id or _pending_archetype_id == "":
		return
	_loadout["archetype"] = _find(_catalog.get("archetypes", []), _pending_archetype_id)
	_save()


func _show_preview(archetype_id: String) -> void:
	if not is_instance_valid(_preview_pivot):
		return

	if _preview_model != null:
		_preview_pivot.remove_child(_preview_model)
		_preview_model.queue_free()
		_preview_model = null

	var archetype: Variant = _find(_catalog.get("archetypes", []), archetype_id)
	var code: String = archetype.get("code", CarLoadout.DEFAULT_ARCHETYPE_CODE) if archetype is Dictionary \
		else CarLoadout.DEFAULT_ARCHETYPE_CODE
	var path: String = RaceDirector.ARCHETYPE_MODELS.get(
		code, RaceDirector.ARCHETYPE_MODELS[CarLoadout.DEFAULT_ARCHETYPE_CODE])

	_preview_model = load(path).instantiate()
	_preview_pivot.add_child(_preview_model)


func _pick_part(category: String, id: String) -> void:
	_loadout[_part_field(category)] = _find(_catalog.get("parts", []), id) if id != "" else null
	_save()


func _find(items: Array, id: String) -> Variant:
	for item in items:
		if item.get("id", "") == id:
			return item
	return null


func _sync_buttons() -> void:
	for id in _archetype_buttons:
		_archetype_buttons[id].button_pressed = id == _pending_archetype_id

	var committed_id: String = _loadout.get("archetype", {}).get("id", "")
	if is_instance_valid(_change_button):
		_change_button.disabled = _pending_archetype_id == committed_id or _pending_archetype_id == ""

	for entry in CATEGORIES:
		var category: String = entry[0]
		var selected = _selected_part_id(category)
		var buttons: Dictionary = _part_buttons.get(category, {})
		for id in buttons:
			buttons[id].button_pressed = id == (selected if selected != null else "")


func _refresh_stats() -> void:
	var stats: Dictionary = _loadout.get("stats", {})
	var speed: float = stats.get("speedScale", 1.0)
	var grip: float = stats.get("grip", 1.0)
	var offroad: float = _loadout.get("archetype", {}).get("offroadGripModifier", 1.0)

	_speed_bar.value = speed
	_grip_bar.value = grip
	_offroad_bar.value = offroad

	_stats_label.text = "Velocidad ×%.2f — Agarre ×%.2f — Fuera de asfalto ×%.2f" % [speed, grip, offroad]


func _flash_error(message: String) -> void:
	var previous := _status.text
	var previous_color := _status.get_theme_color("font_color")
	_status.text = message
	_status.add_theme_color_override("font_color", UiTheme.BAD)
	await get_tree().create_timer(2.5).timeout
	if is_instance_valid(_status):
		_status.text = previous
		_status.add_theme_color_override("font_color", previous_color)


func _set_buttons_disabled(disabled: bool) -> void:
	for button in _all_buttons:
		button.disabled = disabled
	if disabled and is_instance_valid(_change_button):
		_change_button.disabled = true
	elif not disabled:
		_sync_buttons()


# --- Piezas -----------------------------------------------------------------------

func _title(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _label(text: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.7))
	return label


func _toggle_button(text: String, group: ButtonGroup) -> Button:
	var button := UiTheme.make_button(text, UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM)
	button.toggle_mode = true
	button.button_group = group
	_all_buttons.append(button)
	return button


func _button(text: String, on_pressed: Callable) -> Button:
	var button := UiTheme.make_button(text)
	button.pressed.connect(on_pressed)
	_all_buttons.append(button)
	return button
