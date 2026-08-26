extends CanvasLayer

## Pantalla intermedia entre carreras de un Grand Prix — muestra la
## clasificación actual (siempre 3 corredores: el jugador principal y 2
## rivales) y una previsualización de la siguiente pista.
##
## Fija por diseño a 3 filas: el juego solo empareja al jugador con 2 rivales
## por carrera, no hay razón para hacerla dinámica en filas.
##
## Uso:
##   var screen = load("res://scenes/ui/grand-prix-intermission-screen.tscn").instantiate()
##   add_child(screen)
##   screen.show_intermission({
##       "cup_name": "COPA CHICANE",
##       "race_index": 2,
##       "race_total": 4,
##       "standings": [
##           { "name": "JUGADOR_1", "points": 25, "is_player": true, "avatar_color": Color("6faf6f") },
##           { "name": "RIVAL_A",   "points": 18, "is_player": false, "avatar_color": Color("4a7bb0") },
##           { "name": "RIVAL_B",   "points": 15, "is_player": false, "avatar_color": Color("c07858") },
##       ],
##       "next_track": {
##           "id": "nevado",
##           "name": "CIRCUITO NEVADO",
##           "difficulty": 3,  # 1..3 = Fácil/Media/Difícil
##           "laps": 3,
##           "weather": "Nieve",
##           "weather_icon": "❄",
##       },
##   })

signal quit_tournament_requested()
signal next_race_requested(next_track_id: String)

const PLAYER_ROW_BG := Color("f0c14b")
const RIVAL_ROW_BG := Color("d8d4ce")
const MEDAL_GOLD := Color("f0c14b")
const MEDAL_SILVER := Color("c0c0c0")
const MEDAL_BRONZE := Color("cd7f32")

var _payload: Dictionary = {}
var _standings_container: VBoxContainer
var _cup_title: Label
var _race_progress_label: Label
var _next_track_map: PanelContainer
var _next_track_name: Label
var _difficulty_value: Label
var _difficulty_stars: Control
var _laps_value: Label
var _weather_value: Label


func _ready() -> void:
	layer = 9
	_build()


## Muestra la pantalla con los datos concretos. Se puede llamar más de una vez
## si el llamador quiere reutilizar la instancia entre mangas.
func show_intermission(payload: Dictionary) -> void:
	_payload = payload
	_refresh()


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
	columns.add_theme_constant_override("separation", 24)
	body.add_child(columns)

	_build_standings_column(columns)
	_build_next_track_column(columns)

	_build_footer(root)


# --- Cabecera / perfil ---

func _build_profile(parent: Control) -> void:
	var label := UiTheme.marker_label("Perfil activado: JUGADOR_1", UiTheme.FONT_XS)
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

	var title := UiTheme.title_label("Gran Prix - Siguiente carrera", UiTheme.FONT_XL)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	_race_progress_label = UiTheme.heading_label(
		"Carrera 1 de 1", UiTheme.FONT_MD, Color.WHITE)
	_race_progress_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(_race_progress_label)


# --- Columna izquierda: clasificación (3 filas fijas) ---

func _build_standings_column(parent: HBoxContainer) -> void:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(UiTheme.CARD, 14))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_stretch_ratio = 1.0
	parent.add_child(panel)

	var inner := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 16)
	panel.add_child(inner)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	inner.add_child(vbox)

	_cup_title = UiTheme.heading_label(
		"Clasificación actual", UiTheme.FONT_XS, UiTheme.CARD_INK)
	vbox.add_child(_cup_title)

	_standings_container = VBoxContainer.new()
	_standings_container.add_theme_constant_override("separation", 6)
	_standings_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(_standings_container)


func _build_standings_row(position: int, entry: Dictionary) -> PanelContainer:
	var is_player: bool = bool(entry.get("is_player", false))
	var bg_color: Color = PLAYER_ROW_BG if is_player else RIVAL_ROW_BG

	var row := PanelContainer.new()
	row.add_theme_stylebox_override("panel", UiTheme.card_stylebox(bg_color, 10))
	row.custom_minimum_size = Vector2(0, 64)

	var inner := MarginContainer.new()
	for side in ["left", "right"]:
		inner.add_theme_constant_override("margin_" + side, 12)
	for side in ["top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 6)
	row.add_child(inner)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 12)
	inner.add_child(hbox)

	# Posición: medalla dibujada para 1º-3º, número plano para 4º+ (aunque
	# por diseño no llegue).
	var pos_container := Control.new()
	pos_container.custom_minimum_size = Vector2(48, 48)
	hbox.add_child(pos_container)

	if position <= 3:
		var medal := _MedalIcon.new()
		medal.position_number = position
		medal.set_anchors_preset(Control.PRESET_FULL_RECT)
		pos_container.add_child(medal)
	else:
		var num_label := Label.new()
		num_label.text = str(position)
		num_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		num_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		num_label.set_anchors_preset(Control.PRESET_FULL_RECT)
		num_label.add_theme_font_override(
			"font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
		num_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
		num_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
		pos_container.add_child(num_label)

	# Avatar
	var avatar := _AvatarIcon.new()
	avatar.body_color = entry.get("avatar_color", Color("7a9db0"))
	avatar.custom_minimum_size = Vector2(44, 44)
	hbox.add_child(avatar)

	# Nombre
	var name_label := Label.new()
	name_label.text = str(entry.get("name", "?"))
	name_label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	name_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	name_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(name_label)

	# Puntos
	var points_label := Label.new()
	points_label.text = "%d pts" % int(entry.get("points", 0))
	points_label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	points_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	points_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	points_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hbox.add_child(points_label)

	return row


# --- Columna derecha: próxima pista ---

func _build_next_track_column(parent: HBoxContainer) -> void:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(UiTheme.CARD, 14))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_stretch_ratio = 1.0
	parent.add_child(panel)

	var inner := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 16)
	panel.add_child(inner)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	inner.add_child(vbox)

	vbox.add_child(UiTheme.heading_label(
		"Próxima pista", UiTheme.FONT_XS, UiTheme.CARD_INK))

	# Mapa del circuito (placeholder — se puede cambiar por un TextureRect si
	# existe imagen de circuito en el proyecto)
	_next_track_map = PanelContainer.new()
	_next_track_map.add_theme_stylebox_override(
		"panel", UiTheme.card_stylebox(Color("dce8f0"), 10))
	_next_track_map.custom_minimum_size = Vector2(0, 220)
	_next_track_map.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(_next_track_map)

	var map_glyph := Label.new()
	map_glyph.text = "◯"
	map_glyph.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	map_glyph.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	map_glyph.add_theme_font_size_override("font_size", 96)
	map_glyph.add_theme_color_override("font_color", UiTheme.CARD_INK)
	_next_track_map.add_child(map_glyph)

	# Nombre
	_next_track_name = Label.new()
	_next_track_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_next_track_name.add_theme_font_override(
		"font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	_next_track_name.add_theme_font_size_override("font_size", UiTheme.FONT_LG)
	_next_track_name.add_theme_color_override("font_color", UiTheme.CARD_INK)
	vbox.add_child(_next_track_name)

	# Barra inferior con dificultad, vueltas y clima
	vbox.add_child(_build_stats_row())


func _build_stats_row() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(Color("e5e0d8"), 8))
	panel.custom_minimum_size = Vector2(0, 60)

	var inner := MarginContainer.new()
	for side in ["left", "right"]:
		inner.add_theme_constant_override("margin_" + side, 12)
	for side in ["top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 6)
	panel.add_child(inner)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 8)
	inner.add_child(hbox)

	# Dificultad
	var diff_col := VBoxContainer.new()
	diff_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	diff_col.add_theme_constant_override("separation", 2)
	hbox.add_child(diff_col)

	var diff_title := Label.new()
	diff_title.text = "DIFICULTAD:"
	diff_title.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	diff_title.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	diff_title.add_theme_color_override("font_color", UiTheme.CARD_INK)
	diff_col.add_child(diff_title)

	var diff_hbox := HBoxContainer.new()
	diff_hbox.add_theme_constant_override("separation", 4)
	diff_col.add_child(diff_hbox)

	_difficulty_value = Label.new()
	_difficulty_value.add_theme_font_override(
		"font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	_difficulty_value.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_difficulty_value.add_theme_color_override("font_color", UiTheme.CARD_INK)
	diff_hbox.add_child(_difficulty_value)

	_difficulty_stars = _StarsRow.new()
	_difficulty_stars.custom_minimum_size = Vector2(60, 20)
	diff_hbox.add_child(_difficulty_stars)

	# Vueltas
	var laps_col := VBoxContainer.new()
	laps_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	laps_col.add_theme_constant_override("separation", 2)
	hbox.add_child(laps_col)

	var laps_title := Label.new()
	laps_title.text = "VUELTAS:"
	laps_title.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	laps_title.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	laps_title.add_theme_color_override("font_color", UiTheme.CARD_INK)
	laps_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	laps_col.add_child(laps_title)

	_laps_value = Label.new()
	_laps_value.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_laps_value.add_theme_font_override(
		"font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	_laps_value.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	_laps_value.add_theme_color_override("font_color", UiTheme.CARD_INK)
	laps_col.add_child(_laps_value)

	# Clima
	var weather_col := VBoxContainer.new()
	weather_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	weather_col.add_theme_constant_override("separation", 2)
	hbox.add_child(weather_col)

	var weather_title := Label.new()
	weather_title.text = "CLIMA:"
	weather_title.add_theme_font_override(
		"font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	weather_title.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	weather_title.add_theme_color_override("font_color", UiTheme.CARD_INK)
	weather_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	weather_col.add_child(weather_title)

	_weather_value = Label.new()
	_weather_value.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_weather_value.add_theme_font_override(
		"font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	_weather_value.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_weather_value.add_theme_color_override("font_color", UiTheme.CARD_INK)
	weather_col.add_child(_weather_value)

	return panel


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

	var quit_button := UiTheme.pill_button(
		"ABANDONAR TORNEO", UiTheme.BAD, Color.WHITE,
		Vector2(280, 64), UiTheme.FONT_XS)
	UiTheme.emphasize(quit_button)
	quit_button.pressed.connect(_on_quit_pressed)
	hbox.add_child(quit_button)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(spacer)

	var next_button := UiTheme.pill_button(
		"SIGUIENTE CARRERA", UiTheme.BLUE, Color.WHITE,
		Vector2(320, 64), UiTheme.FONT_XS)
	UiTheme.emphasize(next_button)
	next_button.pressed.connect(_on_next_pressed)
	hbox.add_child(next_button)


# --- Refresco / lógica ---

func _refresh() -> void:
	var cup_name: String = str(_payload.get("cup_name", "")).to_upper()
	if cup_name != "":
		_cup_title.text = "CLASIFICACIÓN ACTUAL (%s)" % cup_name
	else:
		_cup_title.text = "CLASIFICACIÓN ACTUAL"

	var race_index: int = int(_payload.get("race_index", 1))
	var race_total: int = int(_payload.get("race_total", 1))
	_race_progress_label.text = "CARRERA %d DE %d" % [race_index, race_total]

	# Clasificación: 3 filas estrictas.
	for child in _standings_container.get_children():
		child.queue_free()

	var standings: Array = _payload.get("standings", [])
	for i in 3:
		if i < standings.size():
			var entry: Dictionary = standings[i]
			_standings_container.add_child(_build_standings_row(i + 1, entry))
		else:
			_standings_container.add_child(_build_standings_row(i + 1, {
				"name": "—", "points": 0, "is_player": false,
				"avatar_color": Color("9a9690"),
			}))

	# Próxima pista
	var next_track: Dictionary = _payload.get("next_track", {})
	_next_track_name.text = str(next_track.get("name", "")).to_upper()

	var difficulty: int = int(next_track.get("difficulty", 1))
	_difficulty_value.text = _difficulty_name(difficulty)
	(_difficulty_stars as _StarsRow).filled = difficulty
	(_difficulty_stars as _StarsRow).total = 3

	_laps_value.text = str(int(next_track.get("laps", 1)))

	var weather_icon: String = str(next_track.get("weather_icon", ""))
	var weather_name: String = str(next_track.get("weather", "Soleado"))
	_weather_value.text = "%s %s" % [weather_icon, weather_name] if weather_icon != "" else weather_name


func _on_quit_pressed() -> void:
	quit_tournament_requested.emit()
	queue_free()


func _on_next_pressed() -> void:
	var next_track: Dictionary = _payload.get("next_track", {})
	var next_track_id: String = str(next_track.get("id", ""))
	next_race_requested.emit(next_track_id)


# --- Piezas ---

func _difficulty_name(d: int) -> String:
	match d:
		1: return "Fácil"
		2: return "Media"
		3: return "Difícil"
	return "?"


# --- Controles dibujados con _draw() ---

class _MedalIcon extends Control:
	var position_number: int = 1:
		set(value):
			position_number = value
			queue_redraw()

	const _MEDAL_GOLD := Color("f0c14b")
	const _MEDAL_SILVER := Color("c0c0c0")
	const _MEDAL_BRONZE := Color("cd7f32")
	const _RIBBON_RED := Color("c4544a")
	const _OUTLINE := Color("2b2822")
	const _OUTLINE_WIDTH := 1.8

	func _draw() -> void:
		var s := minf(size.x, size.y)
		var origin := (size - Vector2(s, s)) * 0.5
		var color: Color = _color_for_position()

		# Cinta roja arriba (solo para 1º)
		if position_number == 1:
			var ribbon := PackedVector2Array([
				origin + Vector2(s * 0.30, s * 0.05),
				origin + Vector2(s * 0.42, s * 0.05),
				origin + Vector2(s * 0.50, s * 0.35),
				origin + Vector2(s * 0.35, s * 0.35),
			])
			draw_colored_polygon(ribbon, _RIBBON_RED)
			draw_polyline(ribbon + PackedVector2Array([ribbon[0]]),
				_OUTLINE, _OUTLINE_WIDTH)

			var ribbon2 := PackedVector2Array([
				origin + Vector2(s * 0.58, s * 0.05),
				origin + Vector2(s * 0.70, s * 0.05),
				origin + Vector2(s * 0.65, s * 0.35),
				origin + Vector2(s * 0.50, s * 0.35),
			])
			draw_colored_polygon(ribbon2, _RIBBON_RED.darkened(0.15))
			draw_polyline(ribbon2 + PackedVector2Array([ribbon2[0]]),
				_OUTLINE, _OUTLINE_WIDTH)

		# Círculo de la medalla
		var center := origin + Vector2(s * 0.5, s * 0.62)
		var radius := s * 0.30

		draw_circle(center, radius, color)
		draw_arc(center, radius, 0, TAU, 32, _OUTLINE, _OUTLINE_WIDTH, true)

		# Número interior
		var text: String = str(position_number) if position_number > 1 else "1"
		var font: Font = ThemeDB.fallback_font
		var font_size: int = int(radius * 1.0)
		var text_size := font.get_string_size(text,
			HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
		draw_string(font, center + Vector2(-text_size.x * 0.5, text_size.y * 0.35),
			text, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size, _OUTLINE)

	func _color_for_position() -> Color:
		match position_number:
			1: return _MEDAL_GOLD
			2: return _MEDAL_SILVER
			3: return _MEDAL_BRONZE
		return _MEDAL_SILVER


class _AvatarIcon extends Control:
	var body_color: Color = Color("7a9db0"):
		set(value):
			body_color = value
			queue_redraw()

	const _SKIN := Color("f4d9b0")
	const _HAIR := Color("6b4a2b")
	const _OUTLINE := Color("2b2822")
	const _OUTLINE_WIDTH := 1.8

	func _draw() -> void:
		var s := minf(size.x, size.y)
		var origin := (size - Vector2(s, s)) * 0.5

		# Fondo redondeado
		var rect := Rect2(origin, Vector2(s, s))
		draw_rect(rect, Color("edeae4"), true)

		# Torso (camisa del color del jugador)
		var torso := PackedVector2Array([
			origin + Vector2(s * 0.15, s * 0.70),
			origin + Vector2(s * 0.85, s * 0.70),
			origin + Vector2(s * 0.85, s * 1.00),
			origin + Vector2(s * 0.15, s * 1.00),
		])
		draw_colored_polygon(torso, body_color)

		# Cabeza
		var head_center := origin + Vector2(s * 0.5, s * 0.42)
		var head_radius := s * 0.22
		draw_circle(head_center, head_radius, _SKIN)
		draw_arc(head_center, head_radius, 0, TAU, 24, _OUTLINE, _OUTLINE_WIDTH, true)

		# Pelo
		var hair := PackedVector2Array([
			head_center + Vector2(-head_radius * 1.05, -head_radius * 0.3),
			head_center + Vector2(-head_radius * 0.9, -head_radius * 1.05),
			head_center + Vector2(head_radius * 0.9, -head_radius * 1.05),
			head_center + Vector2(head_radius * 1.05, -head_radius * 0.3),
			head_center + Vector2(head_radius * 0.7, -head_radius * 0.6),
			head_center + Vector2(-head_radius * 0.7, -head_radius * 0.6),
		])
		draw_colored_polygon(hair, _HAIR)


class _StarsRow extends Control:
	var filled: int = 0:
		set(value):
			filled = value
			queue_redraw()
	var total: int = 3:
		set(value):
			total = value
			queue_redraw()

	const _STAR_ON := Color("c4544a")
	const _STAR_OFF := Color("a8a5a0")

	func _draw() -> void:
		var star_size: float = size.y * 0.9
		var spacing: float = star_size + 2.0
		var cy: float = size.y * 0.5

		for i in total:
			var cx: float = spacing * i + star_size * 0.5
			_draw_star(Vector2(cx, cy), star_size * 0.5,
				_STAR_ON if i < filled else _STAR_OFF)

	func _draw_star(center: Vector2, radius: float, color: Color) -> void:
		var points := PackedVector2Array()
		for i in 10:
			var angle: float = -PI * 0.5 + PI * float(i) / 5.0
			var r: float = radius if i % 2 == 0 else radius * 0.45
			points.append(center + Vector2(cos(angle), sin(angle)) * r)
		draw_colored_polygon(points, color)
