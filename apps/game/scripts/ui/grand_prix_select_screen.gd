extends CanvasLayer

## Pantalla de selección de Grand Prix — carga los GPs activos de la API y
## presenta una card por copa, con imagen, dificultad, recompensas y estado.
## Al pulsar COMENZAR, arranca/reanuda el intento y emite `start_race(gp_id)`
## para que el llamador (main menu → RaceDirector) monte el flujo de mangas.
##
## Estados posibles por copa:
##   - LOCKED: si `is_active` viene en false en la API — el admin la ha
##     desactivado, no se puede correr.
##   - COMPLETED: el jugador tiene un intento terminado (aparece en el
##     leaderboard con `yourPosition != null`).
##   - NOT_PLAYED: caso por defecto.
##
## La clase (100cc/150cc) es informativa por ahora — reutiliza y actualiza
## `GameSettings.engine_class`, que es lo que el resto del juego lee. Si
## algún día el GP tiene su propia clase fija en el servidor, se cambia por
## eso; entretanto, es la preferencia del jugador la que manda.

signal back_requested()
signal start_race(gp_id: String)

enum CupStatus { COMPLETED, NOT_PLAYED, LOCKED }

const HIGHLIGHT := Color("5ce1e6")
const GOLD_TROPHY := Color("f0c14b")
const GOLD_TROPHY_DARK := Color("d9a441")
const ICE_TROPHY := Color("b8dbe8")
const ICE_TROPHY_DARK := Color("7ea8b8")
const COMPLETED_BG := Color("6fbf7f")
const NEUTRAL_BG := Color("d4d0ca")
const LOCKED_BG := Color("bab6b0")

const CLASSES := [100, 150]

const _CLASS_TO_ENGINE := {
	50: GameSettings.EngineClass.CC50,
	100: GameSettings.EngineClass.CC100,
	150: GameSettings.EngineClass.CC150,
}

var _cups: Array = []
var _selected_cup_index: int = 0
var _selected_class: int = 100
var _cup_cards: Array = []
var _class_buttons: Array = []
var _cards_row: HBoxContainer
var _status_label: Label
var _detail_circuit_label: Label
var _detail_rewards_credits: Label
var _detail_rewards_xp: Label
var _start_button: Button
var _busy: bool = false


func _ready() -> void:
	layer = 9
	_selected_class = _current_class()
	_build()
	_show_loading()
	_load_from_api()


func _current_class() -> int:
	# `GameSettings.engine_name()` devuelve "50cc"/"100cc"/"150cc".
	var name_str: String = GameSettings.engine_name()
	return int(name_str.replace("cc", ""))


func _build() -> void:
	add_child(UiTheme.blurred_backdrop(3.0, Color(0.06, 0.05, 0.04, 0.3)))

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	_build_profile(root)
	_build_header(root)

	var body := MarginContainer.new()
	body.set_anchors_preset(Control.PRESET_FULL_RECT)
	body.add_theme_constant_override("margin_top", 120)
	body.add_theme_constant_override("margin_bottom", 120)
	body.add_theme_constant_override("margin_left", 32)
	body.add_theme_constant_override("margin_right", 32)
	root.add_child(body)

	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 20)
	body.add_child(columns)

	_build_cups_column(columns)
	_build_details_column(columns)

	_build_footer(root)


# --- Header y perfil ---

func _build_profile(parent: Control) -> void:
	var name_str: String = Session.email if Session.is_logged_in() else "INVITADO"
	var label := UiTheme.marker_label("Perfil activado: %s" % name_str, UiTheme.FONT_XS)
	label.set_anchors_preset(Control.PRESET_TOP_LEFT)
	label.offset_left = 32
	label.offset_top = 24
	label.offset_right = 500
	label.offset_bottom = 60
	parent.add_child(label)


func _build_header(parent: Control) -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_TOP_WIDE)
	margin.offset_bottom = 115
	margin.add_theme_constant_override("margin_top", 16)
	parent.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 2)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	margin.add_child(vbox)

	var title := UiTheme.title_label("Selección de Gran Prix", UiTheme.FONT_XL)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	var subtitle := UiTheme.heading_label(
		"Elija una copa o torneo", UiTheme.FONT_MD, Color.WHITE)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(subtitle)


# --- Columna izquierda: cards de GPs ---

func _build_cups_column(parent: HBoxContainer) -> void:
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_stretch_ratio = 3.0
	parent.add_child(vbox)

	var title := UiTheme.heading_label(
		"Copas disponibles", UiTheme.FONT_XS, UiTheme.CARD_INK)
	vbox.add_child(title)

	_cards_row = HBoxContainer.new()
	_cards_row.add_theme_constant_override("separation", 16)
	_cards_row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(_cards_row)

	_status_label = UiTheme.label_text("", UiTheme.FONT_SM, UiTheme.CARD_INK)
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status_label.visible = false
	vbox.add_child(_status_label)


func _build_cup_card(index: int, cup: Dictionary) -> Dictionary:
	var status: int = int(cup.get("status", CupStatus.NOT_PLAYED))
	var locked: bool = status == CupStatus.LOCKED

	var container := PanelContainer.new()
	container.custom_minimum_size = Vector2(280, 0)
	container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	container.mouse_filter = Control.MOUSE_FILTER_STOP

	var normal_style := UiTheme.card_stylebox(UiTheme.CARD, 18)
	var selected_style := UiTheme.card_stylebox_selected(HIGHLIGHT, UiTheme.CARD, 18)
	selected_style.set_border_width_all(5)
	container.add_theme_stylebox_override("panel", normal_style)

	var inner := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 12)
	container.add_child(inner)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	inner.add_child(vbox)

	# Fila superior: trofeo (o imagen si hay) + nombre
	var top_row := HBoxContainer.new()
	top_row.add_theme_constant_override("separation", 8)
	vbox.add_child(top_row)

	var trophy := _TrophyIcon.new()
	if _cup_trophy_is_ice(cup):
		trophy.body_color = ICE_TROPHY
		trophy.base_color = ICE_TROPHY_DARK
	else:
		trophy.body_color = GOLD_TROPHY
		trophy.base_color = GOLD_TROPHY_DARK
	trophy.locked = locked
	trophy.custom_minimum_size = Vector2(80, 80)
	top_row.add_child(trophy)

	var name_label := Label.new()
	name_label.text = str(cup.get("name", "COPA")).to_upper()
	name_label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	name_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	name_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	top_row.add_child(name_label)

	# Miniaturas de circuitos
	var thumbs_row := HBoxContainer.new()
	thumbs_row.add_theme_constant_override("separation", 6)
	vbox.add_child(thumbs_row)

	for circuit in cup.get("circuits", []):
		thumbs_row.add_child(_build_circuit_thumb(circuit, locked))

	# Dificultad
	var difficulty_row := HBoxContainer.new()
	difficulty_row.add_theme_constant_override("separation", 6)
	vbox.add_child(difficulty_row)

	var diff_label := Label.new()
	diff_label.text = "DIFICULTAD:"
	diff_label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_SEMIBOLD))
	diff_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	diff_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	difficulty_row.add_child(diff_label)

	var diff_value := Label.new()
	diff_value.text = _difficulty_name(str(cup.get("difficulty", "MEDIUM")))
	diff_value.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	diff_value.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	diff_value.add_theme_color_override("font_color", UiTheme.CARD_INK)
	diff_value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	diff_value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	difficulty_row.add_child(diff_value)

	if not locked:
		var stars := _StarsRow.new()
		stars.filled = _difficulty_stars(str(cup.get("difficulty", "MEDIUM")))
		stars.total = 3
		stars.custom_minimum_size = Vector2(60, 20)
		difficulty_row.add_child(stars)

	# Créditos
	if not locked:
		var credits_row := HBoxContainer.new()
		vbox.add_child(credits_row)

		var credits_label := Label.new()
		credits_label.text = "CRÉDITOS:"
		credits_label.add_theme_font_override(
			"font", UiTheme.weighted_font(UiTheme.WEIGHT_SEMIBOLD))
		credits_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
		credits_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
		credits_row.add_child(credits_label)

		var credits_value := Label.new()
		credits_value.text = "+%s" % _format_number(int(cup.get("credits_reward", 0)))
		credits_value.add_theme_font_override(
			"font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
		credits_value.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
		credits_value.add_theme_color_override("font_color", UiTheme.CARD_INK)
		credits_value.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		credits_value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		credits_row.add_child(credits_value)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(spacer)

	# Barra de estado
	vbox.add_child(_build_status_bar(status))

	container.gui_input.connect(func(event: InputEvent) -> void:
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			_on_cup_pressed(index))

	return {
		"container": container,
		"normal_style": normal_style,
		"selected_style": selected_style,
		"locked": locked,
	}


func _build_circuit_thumb(circuit: Dictionary, locked: bool) -> VBoxContainer:
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 2)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var thumb := PanelContainer.new()
	var weather: String = str(circuit.get("weather", "SUNNY"))
	var bg_color: Color = _weather_bg(weather, locked)
	thumb.add_theme_stylebox_override("panel", UiTheme.card_stylebox(bg_color, 6))
	thumb.custom_minimum_size = Vector2(0, 56)
	col.add_child(thumb)

	var glyph := Label.new()
	glyph.text = "◯" if not locked else "🔒"
	glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	glyph.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	glyph.add_theme_font_size_override("font_size", 28)
	glyph.add_theme_color_override("font_color", UiTheme.CARD_INK if not locked else UiTheme.CARD_MUTED)
	thumb.add_child(glyph)

	var name_label := Label.new()
	name_label.text = str(circuit.get("name", "?"))
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 18)
	name_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	col.add_child(name_label)

	return col


func _weather_bg(weather: String, locked: bool) -> Color:
	if weather == "SNOWY":
		return Color("dce8f0") if not locked else Color("c0c8d0")
	if weather == "RAINY":
		return Color("d8dfe0") if not locked else Color("bfc4c5")
	if weather == "CLOUDY":
		return Color("e0dfda") if not locked else Color("c5c4c0")
	return Color("f0ebe0") if not locked else Color("d0ccc4")


func _build_status_bar(status: int) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(0, 40)

	var bg: Color
	var text: String
	var icon: String
	match status:
		CupStatus.COMPLETED:
			bg = COMPLETED_BG
			text = "COMPLETADA"
			icon = "  🏅"
		CupStatus.NOT_PLAYED:
			bg = NEUTRAL_BG
			text = "NO JUGADA"
			icon = "  U"
		CupStatus.LOCKED:
			bg = LOCKED_BG
			text = "BLOQUEADA"
			icon = "  🔒"

	panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(bg, 8))

	var hbox := HBoxContainer.new()
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	panel.add_child(hbox)

	var label := Label.new()
	label.text = text + icon
	label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	label.add_theme_color_override(
		"font_color", Color.WHITE if status == CupStatus.COMPLETED else UiTheme.CARD_INK)
	hbox.add_child(label)

	return panel


# --- Columna derecha: detalles de la copa ---

func _build_details_column(parent: HBoxContainer) -> void:
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_stretch_ratio = 1.0
	parent.add_child(vbox)

	var top_panel := PanelContainer.new()
	top_panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(UiTheme.CARD, 14))
	top_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(top_panel)

	var top_inner := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		top_inner.add_theme_constant_override("margin_" + side, 14)
	top_panel.add_child(top_inner)

	var top_vbox := VBoxContainer.new()
	top_vbox.add_theme_constant_override("separation", 8)
	top_inner.add_child(top_vbox)

	top_vbox.add_child(UiTheme.heading_label(
		"Detalles de la copa", UiTheme.FONT_XS, UiTheme.CARD_INK))

	# Miniatura del primer circuito (glyph placeholder — la imagen de circuito
	# real se muestra en la pantalla intermedia entre mangas).
	var thumb := PanelContainer.new()
	thumb.add_theme_stylebox_override("panel", UiTheme.card_stylebox(Color("f0ebe0"), 8))
	thumb.custom_minimum_size = Vector2(0, 100)
	top_vbox.add_child(thumb)

	var thumb_glyph := Label.new()
	thumb_glyph.text = "◯"
	thumb_glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	thumb_glyph.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	thumb_glyph.add_theme_font_size_override("font_size", 48)
	thumb_glyph.add_theme_color_override("font_color", UiTheme.CARD_INK)
	thumb.add_child(thumb_glyph)

	_detail_circuit_label = Label.new()
	_detail_circuit_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_detail_circuit_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_detail_circuit_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	top_vbox.add_child(_detail_circuit_label)

	top_vbox.add_child(UiTheme.label_text(
		"CLASE", UiTheme.FONT_XS, UiTheme.CARD_MUTED))

	var class_row := HBoxContainer.new()
	class_row.add_theme_constant_override("separation", 8)
	top_vbox.add_child(class_row)

	for cc in CLASSES:
		var btn := _build_class_button(cc)
		class_row.add_child(btn)
		_class_buttons.append({ "button": btn, "cc": cc })

	var bottom_panel := PanelContainer.new()
	bottom_panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(UiTheme.CARD, 14))
	vbox.add_child(bottom_panel)

	var bottom_inner := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		bottom_inner.add_theme_constant_override("margin_" + side, 14)
	bottom_panel.add_child(bottom_inner)

	var bottom_vbox := VBoxContainer.new()
	bottom_vbox.add_theme_constant_override("separation", 4)
	bottom_inner.add_child(bottom_vbox)

	bottom_vbox.add_child(UiTheme.heading_label(
		"Recompensas", UiTheme.FONT_XS, UiTheme.CARD_INK))

	_detail_rewards_credits = Label.new()
	_detail_rewards_credits.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_detail_rewards_credits.add_theme_color_override("font_color", UiTheme.CARD_INK)
	bottom_vbox.add_child(_detail_rewards_credits)

	_detail_rewards_xp = Label.new()
	_detail_rewards_xp.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_detail_rewards_xp.add_theme_color_override("font_color", UiTheme.CARD_INK)
	bottom_vbox.add_child(_detail_rewards_xp)


func _build_class_button(cc: int) -> Button:
	var btn := UiTheme.pill_button(
		"%dcc" % cc, UiTheme.CARD, UiTheme.CARD_INK,
		Vector2(90, 44), UiTheme.FONT_XS,
		HIGHLIGHT, UiTheme.CARD_INK)
	btn.toggle_mode = true
	btn.pressed.connect(_on_class_pressed.bind(cc))
	return btn


# --- Footer ---

func _build_footer(parent: Control) -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	margin.offset_top = -100
	margin.add_theme_constant_override("margin_bottom", 24)
	margin.add_theme_constant_override("margin_left", 32)
	margin.add_theme_constant_override("margin_right", 32)
	parent.add_child(margin)

	var hbox := HBoxContainer.new()
	margin.add_child(hbox)

	var back_button := UiTheme.pill_button(
		"VOLVER AL MENÚ PRINCIPAL", UiTheme.GOOD, Color.WHITE,
		Vector2(380, 64), UiTheme.FONT_XS)
	UiTheme.emphasize(back_button)
	back_button.pressed.connect(_on_back_pressed)
	hbox.add_child(back_button)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(spacer)

	_start_button = UiTheme.pill_button(
		"COMENZAR GRAN PRIX", UiTheme.BLUE, Color.WHITE,
		Vector2(320, 64), UiTheme.FONT_XS)
	UiTheme.emphasize(_start_button)
	_start_button.pressed.connect(_on_start_pressed)
	_start_button.disabled = true
	hbox.add_child(_start_button)


# --- Carga desde la API ---

func _show_loading() -> void:
	_status_label.text = "CARGANDO GRAN PRIX…"
	_status_label.visible = true


func _show_error(message: String) -> void:
	_status_label.text = message.to_upper()
	_status_label.add_theme_color_override("font_color", UiTheme.BAD)
	_status_label.visible = true


func _load_from_api() -> void:
	if not Session.is_logged_in():
		_show_error("Necesitas una cuenta para acceder al Gran Prix")
		return

	var response = await RacingApi.grand_prix_list()
	if not response.ok or not (response.data is Array):
		_show_error("No se pudo cargar la lista de Gran Prix")
		return

	var items: Array = response.data
	if items.is_empty():
		_show_error("Todavía no hay ningún Gran Prix activo")
		return

	_cups = []
	for item in items:
		if item is Dictionary:
			_cups.append(_gp_to_cup(item))

	# El primer GP no bloqueado queda seleccionado por defecto.
	_selected_cup_index = 0
	for i in _cups.size():
		if int(_cups[i].status) != CupStatus.LOCKED:
			_selected_cup_index = i
			break

	_status_label.visible = false
	_render_cups()
	_refresh_selection()


func _gp_to_cup(item: Dictionary) -> Dictionary:
	var stages: Array = item.get("stages", [])
	var circuits: Array = []
	for stage in stages:
		if stage is Dictionary:
			circuits.append({
				"id": str(stage.get("trackSlug", "")),
				"name": str(stage.get("trackName", "?")),
				"weather": str(stage.get("circuitWeather", "SUNNY")),
			})

	var is_active: bool = bool(item.get("isActive", true))
	# COMPLETED lo marcaría el leaderboard con `yourPosition != null` — no lo
	# consulto aquí para no pagar N llamadas extras al abrir la pantalla; se
	# muestra al abrir el detalle o al terminar el GP.
	var status: int = CupStatus.LOCKED if not is_active else CupStatus.NOT_PLAYED

	return {
		"id": str(item.get("id", "")),
		"slug": str(item.get("slug", "")),
		"name": str(item.get("name", "COPA")),
		"difficulty": str(item.get("difficulty", "MEDIUM")),
		"credits_reward": int(item.get("creditsReward", 0)),
		"xp_reward": int(item.get("xpReward", 0)),
		"circuits": circuits,
		"status": status,
	}


func _render_cups() -> void:
	for child in _cards_row.get_children():
		child.queue_free()
	_cup_cards.clear()

	for i in _cups.size():
		var card := _build_cup_card(i, _cups[i])
		_cards_row.add_child(card.container)
		_cup_cards.append(card)


# --- Selección y refresco ---

func _on_cup_pressed(index: int) -> void:
	var card: Dictionary = _cup_cards[index]
	if bool(card.locked):
		return
	_selected_cup_index = index
	_refresh_selection()


func _on_class_pressed(cc: int) -> void:
	_selected_class = cc
	var engine_class: int = _CLASS_TO_ENGINE.get(cc, GameSettings.EngineClass.CC100)
	GameSettings.set_engine_class(engine_class)
	_refresh_class_buttons()


func _refresh_selection() -> void:
	for i in _cup_cards.size():
		var card: Dictionary = _cup_cards[i]
		var container: PanelContainer = card.container
		var style: StyleBox = card.selected_style if i == _selected_cup_index else card.normal_style
		container.add_theme_stylebox_override("panel", style)

	if _cups.is_empty():
		return

	var cup: Dictionary = _cups[_selected_cup_index]
	var circuits: Array = cup.get("circuits", [])
	_detail_circuit_label.text = str(circuits[0].name) if not circuits.is_empty() else "—"
	_detail_rewards_credits.text = "CRÉDITOS TOTAL:   +%s" % _format_number(int(cup.credits_reward))
	_detail_rewards_xp.text = "XP MP GP:               +%d" % int(cup.xp_reward)

	_refresh_class_buttons()
	_refresh_start_button()


func _refresh_class_buttons() -> void:
	for entry in _class_buttons:
		var btn: Button = entry.button
		btn.button_pressed = int(entry.cc) == _selected_class


func _refresh_start_button() -> void:
	if _cups.is_empty():
		_start_button.disabled = true
		return
	var cup: Dictionary = _cups[_selected_cup_index]
	var locked: bool = int(cup.status) == CupStatus.LOCKED
	_start_button.disabled = locked or _busy


# --- Callbacks de los botones inferiores ---

func _on_back_pressed() -> void:
	back_requested.emit()
	queue_free()


func _on_start_pressed() -> void:
	if _cups.is_empty() or _busy:
		return
	var cup: Dictionary = _cups[_selected_cup_index]
	if int(cup.status) == CupStatus.LOCKED:
		return
	var gp_id: String = str(cup.id)
	print("[GrandPrixSelect] start_race — gp=%s class=%dcc" % [gp_id, _selected_class])
	start_race.emit(gp_id)


# --- Piezas ---

func _difficulty_name(d: String) -> String:
	match d:
		"EASY": return "Fácil"
		"MEDIUM": return "Media"
		"HARD": return "Difícil"
	return "?"


func _difficulty_stars(d: String) -> int:
	match d:
		"EASY": return 1
		"MEDIUM": return 2
		"HARD": return 3
	return 1


func _cup_trophy_is_ice(cup: Dictionary) -> bool:
	# Si todas las mangas son de clima frío, el trofeo se pinta en tono hielo.
	var all_snow := true
	var circuits: Array = cup.get("circuits", [])
	if circuits.is_empty():
		return false
	for circuit in circuits:
		if str(circuit.get("weather", "SUNNY")) != "SNOWY":
			all_snow = false
			break
	return all_snow


func _format_number(n: int) -> String:
	var s := str(n)
	var result := ""
	for i in s.length():
		if i > 0 and (s.length() - i) % 3 == 0:
			result += ","
		result += s[i]
	return result


# --- Controles dibujados con _draw() ---

class _TrophyIcon extends Control:
	var body_color: Color = Color("f0c14b"):
		set(value):
			body_color = value
			queue_redraw()
	var base_color: Color = Color("d9a441"):
		set(value):
			base_color = value
			queue_redraw()
	var locked: bool = false:
		set(value):
			locked = value
			queue_redraw()

	const _OUTLINE := Color("2b2822")
	const _OUTLINE_WIDTH := 2.0

	func _draw() -> void:
		var s := minf(size.x, size.y)
		var origin := (size - Vector2(s, s)) * 0.5

		var body_c: Color = body_color if not locked else body_color.lightened(0.15)
		var base_c: Color = base_color if not locked else base_color.lightened(0.15)

		for side: float in [-1.0, 1.0]:
			var mid: float = 0.5 + side * 0.30
			_poly(origin, s, [
				Vector2(0.5 + side * 0.20, 0.16), Vector2(mid, 0.22),
				Vector2(mid, 0.42), Vector2(0.5 + side * 0.20, 0.40),
			], base_c)

		_poly(origin, s, [
			Vector2(0.24, 0.14), Vector2(0.76, 0.14),
			Vector2(0.66, 0.56), Vector2(0.34, 0.56),
		], body_c)

		_poly(origin, s, [
			Vector2(0.44, 0.56), Vector2(0.56, 0.56),
			Vector2(0.56, 0.74), Vector2(0.44, 0.74),
		], base_c)
		_poly(origin, s, [
			Vector2(0.30, 0.74), Vector2(0.70, 0.74),
			Vector2(0.74, 0.88), Vector2(0.26, 0.88),
		], base_c.darkened(0.15))

		if locked:
			var cx := origin.x + s * 0.5
			var cy := origin.y + s * 0.4
			draw_rect(Rect2(cx - s * 0.09, cy - s * 0.05, s * 0.18, s * 0.18),
				Color("2b2822"), true)
			draw_arc(Vector2(cx, cy - s * 0.05), s * 0.08,
				-PI, 0, 12, Color("2b2822"), 3.0)

	func _poly(origin: Vector2, s: float, points: Array, color: Color) -> void:
		var scaled := PackedVector2Array()
		for point in points:
			scaled.append(origin + Vector2(point) * s)
		draw_colored_polygon(scaled, color)
		draw_polyline(scaled + PackedVector2Array([scaled[0]]),
			_OUTLINE, _OUTLINE_WIDTH)


class _StarsRow extends Control:
	var filled: int = 0:
		set(value):
			filled = value
			queue_redraw()
	var total: int = 3:
		set(value):
			total = value
			queue_redraw()

	const _STAR_ON := Color("f0c14b")
	const _STAR_OFF := Color("a8a5a0")

	func _draw() -> void:
		var star_size: float = size.y * 0.9
		var spacing: float = star_size + 2.0
		var start_x: float = size.x - spacing * total
		var cy: float = size.y * 0.5

		for i in total:
			var cx: float = start_x + spacing * i + star_size * 0.5
			_draw_star(Vector2(cx, cy), star_size * 0.5,
				_STAR_ON if i < filled else _STAR_OFF)

	func _draw_star(center: Vector2, radius: float, color: Color) -> void:
		var points := PackedVector2Array()
		for i in 10:
			var angle: float = -PI * 0.5 + PI * float(i) / 5.0
			var r: float = radius if i % 2 == 0 else radius * 0.45
			points.append(center + Vector2(cos(angle), sin(angle)) * r)
		draw_colored_polygon(points, color)
