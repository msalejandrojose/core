extends CanvasLayer

## Pantalla de podio al finalizar una carrera (imagen de referencia: "Resultados
## de la carrera — Podio final"). Muestra un podio 3D con los tres coches en sus
## puestos, paneles de estadísticas debajo, badge de monedas arriba a la derecha,
## y los botones de "Volver al menú principal" y "Repetir carrera".
##
## A diferencia de las pantallas de resultado anteriores (texto plano sobre fondo
## oscuro), esta integra un SubViewport con escena 3D (pedestales + coches) y
## paneles de tarjeta clara encima — el nuevo lenguaje visual de la app.

const PODIUM_POSITIONS := [2, 1, 3]
const PEDESTAL_WIDTHS := [1.3, 1.5, 1.3]
const PEDESTAL_HEIGHTS := [1.0, 1.5, 0.7]
const PEDESTAL_X := [-1.7, 0.0, 1.7]
const PEDESTAL_COLOR := Color("d0cdc8")
const PEDESTAL_DARK := Color("a8a5a0")

const GOLD := Color("f0c14b")
const SILVER := Color("c0c0c0")
const BRONZE := Color("cd7f32")

const POSITION_COLORS := { 1: GOLD, 2: SILVER, 3: BRONZE }
const POSITION_LABELS := { 1: "1º", 2: "2º", 3: "3º" }

var _director: RaceDirector
var _confetti_particles: GPUParticles3D


func _ready() -> void:
	layer = 9


## Punto de entrada — se llama justo después de instanciar.
##
## `race_data` es un Dictionary con:
##   participants: Array of { name, position, archetype_code, total_ms,
##                            best_lap_ms, xp, is_player }
##   coins_earned: int (monedas ganadas por el jugador)
##   player_name: String
func show_result(race_data: Dictionary) -> void:
	_director = get_tree().get_first_node_in_group("race_director")
	VehicleInput.locked = true
	_build(race_data)


func _build(race_data: Dictionary) -> void:
	var participants: Array = race_data.get("participants", [])
	var coins_earned: int = int(race_data.get("coins_earned", 0))
	var player_name: String = str(race_data.get("player_name", "JUGADOR"))

	# Tinte más claro (alpha 0.35 → 0.18) para que el fondo no quede casi
	# negro: la sensación reportada era que el podio "salía sobre una
	# pantalla en negro" y perdía toda la escena de detrás.
	var backdrop := UiTheme.blurred_backdrop(3.0, Color(0.06, 0.05, 0.04, 0.18))
	add_child(backdrop)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	# --- Podio 3D (centro, detrás de la UI) ---
	var viewport_container := SubViewportContainer.new()
	viewport_container.stretch = true
	viewport_container.set_anchors_preset(Control.PRESET_FULL_RECT)
	viewport_container.anchor_bottom = 0.72
	viewport_container.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(viewport_container)

	var viewport := SubViewport.new()
	viewport.size = Vector2i(1920, 780)
	viewport.transparent_bg = true
	viewport.own_world_3d = true
	viewport_container.add_child(viewport)

	_build_podium_3d(viewport, participants)

	# --- Capa de UI 2D encima ---
	var ui_layer := Control.new()
	ui_layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(ui_layer)

	_build_header(ui_layer, player_name)
	_build_coins_badge(ui_layer, coins_earned, player_name)
	_build_stat_panels(ui_layer, participants)
	_build_footer(ui_layer)


# =============================================================================
# Podio 3D
# =============================================================================

func _build_podium_3d(viewport: SubViewport, participants: Array) -> void:
	var camera := Camera3D.new()
	# Cámara acercada (de 7.0 a 4.6 en Z, 3.2 a 2.4 en Y) y con menos
	# ángulo de visión (75° → 55°) para que los tres coches ocupen más
	# encuadre y el podio quede centrado. Antes se veía todo lejos y con
	# demasiado espacio muerto arriba y a los lados.
	camera.fov = 55.0
	camera.look_at_from_position(Vector3(0, 2.4, 4.6), Vector3(0, 0.9, 0), Vector3.UP)
	viewport.add_child(camera)

	var key_light := DirectionalLight3D.new()
	key_light.rotation_degrees = Vector3(-45, -25, 0)
	key_light.light_energy = 1.2
	viewport.add_child(key_light)

	var fill_light := DirectionalLight3D.new()
	fill_light.rotation_degrees = Vector3(-30, 160, 0)
	fill_light.light_energy = 0.4
	viewport.add_child(fill_light)

	var env := Environment.new()
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("e8ddd0")
	env.ambient_light_energy = 0.6
	var world_env := WorldEnvironment.new()
	world_env.environment = env
	viewport.add_child(world_env)

	var by_position := {}
	for p in participants:
		by_position[int(p.get("position", 99))] = p

	for i in 3:
		var pos: int = PODIUM_POSITIONS[i]
		var entry: Dictionary = by_position.get(pos, {})
		var archetype: String = str(entry.get("archetype_code", "normal"))

		var x: float = PEDESTAL_X[i]
		var h: float = PEDESTAL_HEIGHTS[i]
		var w: float = PEDESTAL_WIDTHS[i]

		# Pedestal
		var pedestal := MeshInstance3D.new()
		var box_mesh := BoxMesh.new()
		box_mesh.size = Vector3(w, h, w)
		pedestal.mesh = box_mesh
		pedestal.position = Vector3(x, h * 0.5, 0)
		pedestal.material_override = _flat_material(PEDESTAL_COLOR)
		viewport.add_child(pedestal)

		# Franja frontal del pedestal
		var front := MeshInstance3D.new()
		var front_mesh := BoxMesh.new()
		front_mesh.size = Vector3(w * 0.9, h * 0.15, 0.02)
		front.mesh = front_mesh
		front.position = Vector3(x, h * 0.7, w * 0.5 + 0.01)
		front.material_override = _flat_material(PEDESTAL_DARK)
		viewport.add_child(front)

		# Número de posición (como una placa 3D en el pedestal)
		var number := MeshInstance3D.new()
		var number_mesh := BoxMesh.new()
		number_mesh.size = Vector3(0.45, 0.45, 0.06)
		number.mesh = number_mesh
		number.position = Vector3(x, h * 0.45, w * 0.5 + 0.04)
		number.material_override = _flat_material(POSITION_COLORS.get(pos, SILVER))
		viewport.add_child(number)

		# Coche encima
		var model_path: String = RaceDirector.ARCHETYPE_MODELS.get(
			archetype, RaceDirector.ARCHETYPE_MODELS[CarLoadout.DEFAULT_ARCHETYPE_CODE])
		var model: Node = load(model_path).instantiate()
		model.position = Vector3(x, h + 0.05, 0)
		model.rotation_degrees.y = -15.0
		model.scale = Vector3.ONE * 0.9
		viewport.add_child(model)

		# Confetti para el 1er puesto si es el jugador
		if pos == 1 and entry.get("is_player", false):
			_add_confetti(viewport, Vector3(x, h + 1.5, 0))

	# Arco de meta detrás
	var arch: Node = load("res://models/track-finish.glb").instantiate()
	arch.position = Vector3(0, -0.2, -2.5)
	arch.scale = Vector3.ONE * 0.5
	viewport.add_child(arch)


func _add_confetti(viewport: SubViewport, position: Vector3) -> void:
	_confetti_particles = GPUParticles3D.new()
	_confetti_particles.position = position
	_confetti_particles.amount = 60
	_confetti_particles.lifetime = 2.5
	_confetti_particles.explosiveness = 0.3
	_confetti_particles.visibility_aabb = AABB(Vector3(-3, -3, -3), Vector3(6, 6, 6))

	var material := ParticleProcessMaterial.new()
	material.direction = Vector3(0, 1, 0)
	material.spread = 45.0
	material.initial_velocity_min = 2.0
	material.initial_velocity_max = 5.0
	material.gravity = Vector3(0, -4.0, 0)
	material.scale_min = 0.04
	material.scale_max = 0.1
	material.color = Color.WHITE
	var gradient := GradientTexture1D.new()
	var g := Gradient.new()
	g.add_point(0.0, GOLD)
	g.add_point(0.33, Color("e84c4c"))
	g.add_point(0.66, Color("4c8ce8"))
	g.add_point(1.0, Color("4ce868"))
	gradient.gradient = g
	material.color_ramp = gradient

	_confetti_particles.process_material = material

	var quad := QuadMesh.new()
	quad.size = Vector2(0.1, 0.1)
	_confetti_particles.draw_pass_1 = quad

	viewport.add_child(_confetti_particles)


## Activa o desactiva el confetti.
func set_confetti_enabled(enabled: bool) -> void:
	if _confetti_particles != null:
		_confetti_particles.emitting = enabled


func _flat_material(color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	return material


# =============================================================================
# UI 2D
# =============================================================================

func _build_header(parent: Control, _player_name: String) -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_TOP_WIDE)
	margin.offset_bottom = 120
	for side in ["left", "right", "top"]:
		margin.add_theme_constant_override("margin_" + side, 32)
	parent.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 2)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	margin.add_child(vbox)

	var title := UiTheme.title_label("Resultados de la carrera", UiTheme.FONT_XL)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(title)

	var subtitle := UiTheme.heading_label("Podio final", UiTheme.FONT_MD, Color.WHITE)
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(subtitle)


func _build_coins_badge(parent: Control, coins_earned: int, player_name: String) -> void:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiTheme.card_stylebox(UiTheme.CARD, 14))
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.offset_left = -280
	panel.offset_right = -24
	panel.offset_top = 24
	panel.offset_bottom = 140

	var inner_margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		inner_margin.add_theme_constant_override("margin_" + side, 16)
	panel.add_child(inner_margin)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 4)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	inner_margin.add_child(vbox)

	var badge_title := UiTheme.heading_label(
		"Monedas del usuario", UiTheme.FONT_XS, UiTheme.CARD_MUTED)
	badge_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(badge_title)

	var name_label := UiTheme.label_text(
		"%s (Usuario)" % player_name.to_upper(), UiTheme.FONT_XS, UiTheme.CARD_MUTED)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(name_label)

	var coins_label := Label.new()
	coins_label.text = "+%s" % _format_number(coins_earned)
	coins_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	coins_label.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_BOLD))
	coins_label.add_theme_font_size_override("font_size", UiTheme.FONT_LG)
	coins_label.add_theme_color_override("font_color", UiTheme.GOOD)
	vbox.add_child(coins_label)

	parent.add_child(panel)


func _build_stat_panels(parent: Control, participants: Array) -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	margin.offset_top = -260
	for side in ["left", "right", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 32)
	parent.add_child(margin)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 20)
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	margin.add_child(hbox)

	var sorted := participants.duplicate()
	sorted.sort_custom(func(a, b): return int(a.get("position", 99)) < int(b.get("position", 99)))

	var order := [1, 0, 2]
	for idx in order:
		if idx < sorted.size():
			hbox.add_child(_stat_card(sorted[idx]))
		else:
			var empty := Control.new()
			empty.custom_minimum_size = Vector2(300, 200)
			hbox.add_child(empty)


func _stat_card(entry: Dictionary) -> PanelContainer:
	var position: int = int(entry.get("position", 0))
	var is_player: bool = bool(entry.get("is_player", false))
	var pos_color: Color = POSITION_COLORS.get(position, SILVER)

	var panel := PanelContainer.new()
	var style := UiTheme.card_stylebox(UiTheme.CARD, 14) if not is_player \
		else UiTheme.card_stylebox_selected(pos_color, UiTheme.CARD, 14)
	panel.add_theme_stylebox_override("panel", style)
	panel.custom_minimum_size = Vector2(300, 180)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var inner := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		inner.add_theme_constant_override("margin_" + side, 16)
	panel.add_child(inner)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 6)
	inner.add_child(vbox)

	# Nombre
	var name_text: String = str(entry.get("name", "Rival"))
	var name_label := UiTheme.heading_label(name_text, UiTheme.FONT_MD, UiTheme.CARD_INK)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vbox.add_child(name_label)

	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 4)
	sep.add_theme_stylebox_override("separator", _thin_separator())
	vbox.add_child(sep)

	# Estadísticas
	var hud_script := load("res://scripts/ui/race_hud.gd")

	var total_ms: int = int(entry.get("total_ms", 0))
	vbox.add_child(_stat_row("Tiempo total:", hud_script.format_ms(total_ms)))

	var best_ms: int = int(entry.get("best_lap_ms", 0))
	vbox.add_child(_stat_row("Mejor vuelta:", hud_script.format_ms(best_ms)))

	var xp: int = int(entry.get("xp", 0))
	vbox.add_child(_stat_row("XP:", "+%d" % xp))

	return panel


func _stat_row(label_text: String, value_text: String) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)

	var label := UiTheme.label_text(label_text, UiTheme.FONT_XS, UiTheme.CARD_MUTED)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)

	var value := Label.new()
	value.text = value_text
	value.add_theme_font_override("font", UiTheme.weighted_font(UiTheme.WEIGHT_SEMIBOLD))
	value.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	value.add_theme_color_override("font_color", UiTheme.CARD_INK)
	value.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	row.add_child(value)

	return row


func _build_footer(parent: Control) -> void:
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	margin.offset_top = -80
	for side in ["left", "right", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 32)
	parent.add_child(margin)

	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 16)
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	margin.add_child(hbox)

	var menu_button := UiTheme.pill_button(
		"VOLVER AL MENÚ PRINCIPAL", UiTheme.GOOD, Color.WHITE,
		Vector2(380, 72), UiTheme.FONT_SM)
	UiTheme.emphasize(menu_button)
	menu_button.pressed.connect(func() -> void:
		queue_free()
		_director.open_menu())
	hbox.add_child(menu_button)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(spacer)

	var rematch_button := UiTheme.pill_button(
		"REPETIR CARRERA  ◆", UiTheme.BLUE, Color.WHITE,
		Vector2(300, 72), UiTheme.FONT_SM)
	UiTheme.emphasize(rematch_button)
	rematch_button.pressed.connect(func() -> void:
		queue_free()
		_director.restart())
	hbox.add_child(rematch_button)


func _thin_separator() -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(0, 0, 0, 0.12)
	box.content_margin_top = 1
	box.content_margin_bottom = 1
	return box


func _format_number(n: int) -> String:
	var s := str(n)
	var result := ""
	for i in s.length():
		if i > 0 and (s.length() - i) % 3 == 0:
			result += ","
		result += s[i]
	return result
