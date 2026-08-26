extends CanvasLayer

## Lobby de búsqueda de rivales para carrera en vivo — rediseño visual con tres
## columnas (jugadores conectados / radar animado / detalles de la carrera),
## fondo 3D difuminado y radar con línea giratoria + iconos wifi pulsantes.
##
## La lógica de red es la misma: `LiveRaceSocket` para buscar, cancelar,
## cuenta atrás y arranque. Solo cambia cómo se pinta.

signal closed()

const MAX_SLOTS := 4
const RADAR_COLOR := Color("4a4e54")
const RADAR_LINE_COLOR := Color("56c498")
const WIFI_COLOR := Color("56c498")

enum _Phase { IDLE, SEARCHING, MATCHED, STARTING }

var _phase: int = _Phase.IDLE
var _track_slug: String = ""

var _status_label: Label
var _search_button: Button
var _cancel_button: Button
var _player_slots: Array[Dictionary] = []
var _radar_sweep: Control
var _radar_blips: Array[Control] = []
var _countdown_timer: Timer
var _countdown_ms_left: int = 0
var _player_ids: Array = []


func _ready() -> void:
	layer = 9
	_track_slug = GameSettings.track_key()
	_build()

	LiveRaceSocket.room_update.connect(_on_room_update)
	LiveRaceSocket.countdown.connect(_on_countdown)
	LiveRaceSocket.race_started.connect(_on_race_started)
	LiveRaceSocket.connection_failed.connect(_on_connection_failed)

	_sync_phase()


func _exit_tree() -> void:
	if _phase == _Phase.SEARCHING or _phase == _Phase.MATCHED:
		LiveRaceSocket.leave()


func close_screen() -> void:
	closed.emit()
	queue_free()


func _process(delta: float) -> void:
	if _radar_sweep != null and (_phase == _Phase.SEARCHING or _phase == _Phase.MATCHED):
		_radar_sweep.rotation += delta * 1.8


# =============================================================================
# Build
# =============================================================================

func _build() -> void:
	add_child(UiTheme.blurred_backdrop(3.0, Color(0.06, 0.05, 0.04, 0.3)))

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	_build_header(root)
	_build_network_badge(root)

	var body_margin := MarginContainer.new()
	body_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	body_margin.add_theme_constant_override("margin_top", 120)
	body_margin.add_theme_constant_override("margin_bottom", 32)
	body_margin.add_theme_constant_override("margin_left", 32)
	body_margin.add_theme_constant_override("margin_right", 32)
	root.add_child(body_margin)

	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 24)
	body_margin.add_child(columns)

	_build_players_column(columns)
	_build_radar_column(columns)
	_build_details_column(columns)


# --- Header ---

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

	var title := UiTheme.title_label("Búsqueda de rivales", UiTheme.FONT_XL)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	_status_label = UiTheme.heading_label("Esperando jugadores...", UiTheme.FONT_MD, Color.WHITE)
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(_status_label)


func _build_network_badge(parent: Control) -> void:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(UiTheme.CARD, 10))
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.offset_left = -180
	panel.offset_right = -24
	panel.offset_top = 20
	panel.offset_bottom = 64

	var inner := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 8)
	panel.add_child(inner)

	var label := UiTheme.heading_label("NETWORK", UiTheme.FONT_XS, UiTheme.CARD_INK)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	inner.add_child(label)

	parent.add_child(panel)


# --- Columna izquierda: Jugadores ---

func _build_players_column(parent: HBoxContainer) -> void:
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

	var col_title := UiTheme.heading_label(
		"Jugadores conectados", UiTheme.FONT_XS, UiTheme.CARD_INK)
	vbox.add_child(col_title)

	for i in MAX_SLOTS:
		var slot := _build_player_slot(i)
		vbox.add_child(slot.container)
		_player_slots.append(slot)

	_refresh_player_slots()


func _build_player_slot(index: int) -> Dictionary:
	var container := PanelContainer.new()
	container.add_theme_stylebox_override("panel", UiTheme.card_stylebox(
		Color("edeae6"), 10))
	container.custom_minimum_size = Vector2(0, 56)

	var inner := MarginContainer.new()
	for side in ["left", "right"]:
		inner.add_theme_constant_override("margin_" + side, 12)
	for side in ["top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 6)
	container.add_child(inner)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 12)
	inner.add_child(hbox)

	# Avatar placeholder
	var avatar := ColorRect.new()
	avatar.color = Color("b0aaa0")
	avatar.custom_minimum_size = Vector2(40, 40)
	hbox.add_child(avatar)

	var text_col := VBoxContainer.new()
	text_col.add_theme_constant_override("separation", 0)
	text_col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(text_col)

	var name_label := Label.new()
	name_label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_SEMIBOLD))
	name_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	name_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	text_col.add_child(name_label)

	var status_label := Label.new()
	status_label.add_theme_font_size_override("font_size", 20)
	status_label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	text_col.add_child(status_label)

	return {
		"container": container,
		"name_label": name_label,
		"status_label": status_label,
		"avatar": avatar,
	}


# --- Columna central: Radar ---

func _build_radar_column(parent: HBoxContainer) -> void:
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 16)
	vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vbox.size_flags_stretch_ratio = 1.2
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	parent.add_child(vbox)

	var radar_panel := PanelContainer.new()
	radar_panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(RADAR_COLOR, 16))
	radar_panel.custom_minimum_size = Vector2(300, 300)
	radar_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	radar_panel.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	vbox.add_child(radar_panel)

	var radar_container := Control.new()
	radar_container.custom_minimum_size = Vector2(280, 280)
	radar_panel.add_child(radar_container)

	_build_radar_display(radar_container)

	_cancel_button = UiTheme.pill_button(
		"CANCELAR BÚSQUEDA", UiTheme.BAD, Color.WHITE,
		Vector2(300, 64), UiTheme.FONT_SM)
	UiTheme.emphasize(_cancel_button)
	_cancel_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_cancel_button.pressed.connect(_on_cancel_pressed)
	vbox.add_child(_cancel_button)

	_search_button = UiTheme.pill_button(
		"BUSCAR PARTIDA", UiTheme.BLUE, Color.WHITE,
		Vector2(300, 64), UiTheme.FONT_SM)
	UiTheme.emphasize(_search_button)
	_search_button.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_search_button.pressed.connect(_on_search_pressed)
	vbox.add_child(_search_button)


func _build_radar_display(parent: Control) -> void:
	# Anillos concéntricos dibujados con el control personalizado
	var rings := _RadarRings.new()
	rings.set_anchors_preset(Control.PRESET_FULL_RECT)
	parent.add_child(rings)

	# Línea de barrido giratoria
	_radar_sweep = _RadarSweep.new()
	_radar_sweep.set_anchors_preset(Control.PRESET_CENTER)
	_radar_sweep.size = Vector2(280, 280)
	_radar_sweep.pivot_offset = Vector2(140, 140)
	_radar_sweep.position = Vector2(-140, -140)
	parent.add_child(_radar_sweep)

	# Blips (iconos wifi que aparecen al encontrar rivales)
	for i in 3:
		var blip := _RadarBlip.new()
		blip.visible = false
		parent.add_child(blip)
		_radar_blips.append(blip)


# --- Columna derecha: Detalles ---

func _build_details_column(parent: HBoxContainer) -> void:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(UiTheme.CARD, 14))
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_stretch_ratio = 0.8
	parent.add_child(panel)

	var inner := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 16)
	panel.add_child(inner)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	inner.add_child(vbox)

	var col_title := UiTheme.heading_label(
		"Detalles de la carrera", UiTheme.FONT_XS, UiTheme.CARD_INK)
	vbox.add_child(col_title)

	# Circuito
	vbox.add_child(_detail_heading("Circuito"))
	var circuit_name := UiTheme.label_text(_track_display_name(), UiTheme.FONT_SM, UiTheme.CARD_INK)
	vbox.add_child(circuit_name)

	# Clase
	vbox.add_child(_detail_heading("Clase"))
	var class_label := Label.new()
	class_label.text = GameSettings.engine_name()
	class_label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	class_label.add_theme_font_size_override("font_size", UiTheme.FONT_LG)
	class_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	vbox.add_child(class_label)

	# Sentido
	vbox.add_child(_detail_heading("Sentido"))
	var direction_label := Label.new()
	direction_label.text = "Inverso" if GameSettings.reverse else "Normal"
	direction_label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	direction_label.add_theme_font_size_override("font_size", UiTheme.FONT_LG)
	direction_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	vbox.add_child(direction_label)

	# Miniatura del vehículo
	var preview := VehiclePreview.new()
	preview.custom_minimum_size = Vector2(120, 100)
	preview.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(preview)
	preview.show_archetype(CarLoadout.archetype_code)


func _detail_heading(text: String) -> Label:
	return UiTheme.label_text(text.to_upper(), UiTheme.FONT_XS, UiTheme.CARD_MUTED)


func _track_display_name() -> String:
	var id := GameSettings.track_id
	if TrackCatalog.ids().has(id):
		return TrackCatalog.by_id(id).name
	return id


# =============================================================================
# Lógica de red (misma que antes, cambia cómo se pinta)
# =============================================================================

func _on_search_pressed() -> void:
	_phase = _Phase.SEARCHING
	_sync_phase()
	LiveRaceSocket.connect_and_join(_track_slug)


func _on_cancel_pressed() -> void:
	if _phase == _Phase.IDLE:
		close_screen()
		return
	LiveRaceSocket.leave()
	_phase = _Phase.IDLE
	_sync_phase()


func _on_room_update(_room_id: String, _status: String, player_ids: Array) -> void:
	_player_ids = player_ids
	_refresh_player_slots()
	_refresh_radar_blips()
	_sync_phase()


func _on_countdown(_room_id: String, ms: int) -> void:
	_phase = _Phase.MATCHED
	_countdown_ms_left = ms
	if not is_instance_valid(_countdown_timer):
		_countdown_timer = Timer.new()
		_countdown_timer.wait_time = 1.0
		_countdown_timer.timeout.connect(_on_countdown_tick)
		add_child(_countdown_timer)
	_countdown_timer.start()
	_sync_phase()


func _on_countdown_tick() -> void:
	_countdown_ms_left = maxi(0, _countdown_ms_left - 1000)
	_sync_phase()
	if _countdown_ms_left <= 0 and is_instance_valid(_countdown_timer):
		_countdown_timer.stop()


func _on_race_started(_room_id: String, _start_at: int) -> void:
	_phase = _Phase.STARTING
	var director: Node = get_tree().get_first_node_in_group("race_director")
	close_screen()
	if director != null:
		director.start_live_race(_track_slug)


func _on_connection_failed(reason: String) -> void:
	_phase = _Phase.IDLE
	_sync_phase()
	if is_instance_valid(_status_label):
		_status_label.text = "NO SE PUDO CONECTAR: %s" % reason.to_upper()


func _sync_phase() -> void:
	if not is_instance_valid(_search_button):
		return

	_search_button.visible = _phase == _Phase.IDLE
	_cancel_button.visible = _phase != _Phase.IDLE

	match _phase:
		_Phase.IDLE:
			_status_label.text = "ESPERANDO JUGADORES..."
		_Phase.SEARCHING:
			_status_label.text = "BUSCANDO RIVALES..."
		_Phase.MATCHED:
			_status_label.text = "¡RIVALES ENCONTRADOS! ARRANCANDO EN %dS..." % ceili(_countdown_ms_left / 1000.0)
		_Phase.STARTING:
			_status_label.text = "¡ARRANCANDO!"


func _refresh_player_slots() -> void:
	for i in MAX_SLOTS:
		if i >= _player_slots.size():
			break
		var slot: Dictionary = _player_slots[i]
		var name_label: Label = slot.name_label
		var status_label: Label = slot.status_label
		var avatar: ColorRect = slot.avatar

		if i == 0:
			name_label.text = "JUGADOR"
			status_label.text = "Tú"
			avatar.color = Color("7fb5a0")
		elif i < _player_ids.size():
			name_label.text = "JUGADOR_%d" % (i + 1)
			status_label.text = "Encontrado"
			avatar.color = Color("c07858")
		else:
			name_label.text = "RIVAL_%s" % char(65 + i)
			status_label.text = "Buscando..."
			avatar.color = Color("b0aaa0")


func _refresh_radar_blips() -> void:
	var blip_positions := [
		Vector2(0.7, 0.3), Vector2(0.25, 0.6), Vector2(0.8, 0.75),
	]
	for i in _radar_blips.size():
		var blip: Control = _radar_blips[i]
		var found := (i + 1) < _player_ids.size()
		if found and not blip.visible:
			blip.visible = true
			blip.position = blip_positions[i] * Vector2(240, 240) + Vector2(20, 20)
			_tween_blip(blip)
		elif not found:
			blip.visible = false


func _tween_blip(blip: Control) -> void:
	var tween := create_tween()
	tween.set_loops()
	tween.tween_property(blip, "modulate:a", 0.3, 0.6).set_trans(Tween.TRANS_SINE)
	tween.tween_property(blip, "modulate:a", 1.0, 0.6).set_trans(Tween.TRANS_SINE)


# =============================================================================
# Controles internos dibujados con _draw()
# =============================================================================

class _RadarRings extends Control:
	func _draw() -> void:
		var center := size * 0.5
		var max_r := minf(size.x, size.y) * 0.45
		var ring_color := Color(1, 1, 1, 0.12)
		var cross_color := Color(1, 1, 1, 0.08)

		draw_line(Vector2(center.x, center.y - max_r),
			Vector2(center.x, center.y + max_r), cross_color, 1.0)
		draw_line(Vector2(center.x - max_r, center.y),
			Vector2(center.x + max_r, center.y), cross_color, 1.0)

		for i in 4:
			var r: float = max_r * (float(i + 1) / 4.0)
			draw_arc(center, r, 0, TAU, 64, ring_color, 1.5, true)

		draw_circle(center, 4.0, Color(1, 1, 1, 0.3))


class _RadarSweep extends Control:
	func _draw() -> void:
		var center := size * 0.5
		var max_r := minf(size.x, size.y) * 0.45
		var end := center + Vector2(0, -max_r)
		draw_line(center, end, Color("56c498"), 2.5)

		var sweep_points := PackedVector2Array()
		var sweep_colors := PackedColorArray()
		var steps := 24
		for i in steps + 1:
			var angle: float = -float(i) / float(steps) * PI * 0.25
			var point := center + Vector2(sin(angle), -cos(angle)) * max_r
			sweep_points.append(point)
			sweep_colors.append(Color(0.34, 0.77, 0.6, 0.18 * (1.0 - float(i) / float(steps))))
		for i in steps:
			var tri := PackedVector2Array([center, sweep_points[i], sweep_points[i + 1]])
			var alpha: float = 0.15 * (1.0 - float(i) / float(steps))
			draw_colored_polygon(tri, Color(0.34, 0.77, 0.6, alpha))


class _RadarBlip extends Control:
	func _ready() -> void:
		custom_minimum_size = Vector2(24, 24)
		size = Vector2(24, 24)

	func _draw() -> void:
		var s := minf(size.x, size.y)
		var cx := s * 0.5
		var cy := s * 0.5

		draw_arc(Vector2(cx, cy), s * 0.35, -PI * 0.85, -PI * 0.15, 12,
			Color("56c498"), 2.0, true)
		draw_arc(Vector2(cx, cy), s * 0.22, -PI * 0.8, -PI * 0.2, 10,
			Color("56c498"), 2.0, true)
		draw_circle(Vector2(cx, cy + s * 0.1), 2.5, Color("56c498"))
