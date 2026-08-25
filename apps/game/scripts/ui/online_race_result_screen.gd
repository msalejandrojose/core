extends CanvasLayer

## Podio de resultado para una carrera online asíncrona (TASK-283/287): los
## hasta 3 corredores (jugador + hasta 2 fantasmas rivales), la diferencia
## contra el récord personal (aunque no coincida con el podio — perder la
## carrera y aun así batir tu propia marca se celebra igual), el desglose de
## monedas ganadas, y revancha inmediata sin pasar por el menú.

const COIN_SOURCE_LABELS := {
	"RACE_FIRST_PLACE": "1er puesto",
	"RACE_SECOND_PLACE": "2º puesto",
	"RACE_THIRD_PLACE": "3er puesto",
	"BEAT_FRIEND": "Ganaste a un amigo",
	"WIN_STREAK": "Racha de victorias",
}

var _director: RaceDirector
var _rematch_button: Button
var _status_label: Label


func _ready() -> void:
	layer = 9


## `response_data` es tal cual lo devuelve `POST .../online-races`:
## `{ id, trackId, createdAt, participants: [{role, userId, durationMs,
## position, deltaMs}], coinsEarned: [{amount, source}] }`.
func show_result(response_data: Dictionary, previous_best_ms: Variant, is_new_record: bool) -> void:
	_director = get_tree().get_first_node_in_group("race_director")
	VehicleInput.locked = true
	_build(response_data, previous_best_ms, is_new_record)


func _build(response_data: Dictionary, previous_best_ms: Variant, is_new_record: bool) -> void:
	var backdrop := ColorRect.new()
	backdrop.color = UiTheme.ink_alpha(0.94)
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
	title.text = "Carrera terminada"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	title.add_theme_color_override("font_color", UiTheme.BONE)
	column.add_child(title)

	var hud_script := load("res://scripts/ui/race_hud.gd")

	var participants: Array = response_data.get("participants", [])
	participants = participants.duplicate()
	participants.sort_custom(func(a, b): return int(a.get("position", 99)) < int(b.get("position", 99)))

	var podium := VBoxContainer.new()
	podium.add_theme_constant_override("separation", 6)
	column.add_child(podium)

	for entry in participants:
		podium.add_child(_build_podium_row(entry, hud_script))

	var record_label := Label.new()
	record_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	record_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	if is_new_record:
		record_label.text = "¡Nuevo récord personal!"
		record_label.add_theme_color_override("font_color", UiTheme.GOOD)
	elif previous_best_ms != null:
		# El delta del jugador se calcula contra `previous_best_ms`, NO contra
		# el podio: puede perder la carrera y aun así batir su propia marca —
		# eso se celebra igual (criterio de done de TASK-287).
		var player_entry := _find_player(participants)
		var player_duration: int = int(player_entry.get("durationMs", 0))
		var delta: int = player_duration - int(previous_best_ms)
		record_label.text = "%s respecto a tu mejor marca" % hud_script.format_delta_ms(delta)
		record_label.add_theme_color_override("font_color", UiTheme.GOOD if delta < 0 else UiTheme.BAD)
	else:
		record_label.text = "Primera vez que corres esta combinación de circuito, sentido y cilindrada."
		record_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.7))
	column.add_child(record_label)

	var coins_earned: Array = response_data.get("coinsEarned", [])
	if not coins_earned.is_empty():
		column.add_child(_build_coins_section(coins_earned))

	_status_label = Label.new()
	_status_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_status_label.add_theme_color_override("font_color", UiTheme.BAD)
	column.add_child(_status_label)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(spacer)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	column.add_child(row)

	var menu_button := UiTheme.make_button("Menú")
	menu_button.pressed.connect(func() -> void:
		_director.open_menu()
		queue_free())
	row.add_child(menu_button)

	var push := Control.new()
	push.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(push)

	_rematch_button = UiTheme.make_button(
		"Revancha", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_LG)
	_rematch_button.pressed.connect(_on_rematch_pressed)
	row.add_child(_rematch_button)


func _build_podium_row(entry: Dictionary, hud_script) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)

	var position: int = int(entry.get("position", 0))
	var is_player := str(entry.get("role", "")) == "PLAYER"

	var position_label := Label.new()
	position_label.text = "#%d" % position
	position_label.custom_minimum_size = Vector2(64, 0)
	position_label.add_theme_font_size_override("font_size", UiTheme.FONT_LG)
	position_label.add_theme_color_override(
		"font_color", UiTheme.GOOD if position == 1 else UiTheme.BONE)
	row.add_child(position_label)

	var name_label := Label.new()
	name_label.text = "Tú" if is_player else "Rival"
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	name_label.add_theme_color_override(
		"font_color", UiTheme.CLAY if is_player else UiTheme.BONE * Color(1, 1, 1, 0.7))
	row.add_child(name_label)

	var time_label := Label.new()
	time_label.text = hud_script.format_ms(int(entry.get("durationMs", 0)))
	time_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	time_label.add_theme_color_override("font_color", UiTheme.BONE)
	row.add_child(time_label)

	var delta_label := Label.new()
	delta_label.text = "—" if position == 1 else hud_script.format_delta_ms(int(entry.get("deltaMs", 0)))
	delta_label.custom_minimum_size = Vector2(96, 0)
	delta_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	delta_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.6))
	row.add_child(delta_label)

	return row


func _build_coins_section(coins_earned: Array) -> VBoxContainer:
	var coins_column := VBoxContainer.new()
	coins_column.add_theme_constant_override("separation", 4)

	var total := 0
	for reward in coins_earned:
		var amount: int = int(reward.get("amount", 0))
		total += amount
		var source := str(reward.get("source", ""))
		var reward_label := Label.new()
		reward_label.text = "+%d — %s" % [amount, COIN_SOURCE_LABELS.get(source, source)]
		reward_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
		reward_label.add_theme_color_override("font_color", UiTheme.GOOD)
		coins_column.add_child(reward_label)

	# Solo hace falta un total si hay más de un bono que sumar — con uno
	# solo, repetir el mismo número justo debajo no aporta nada.
	if coins_earned.size() > 1:
		var total_label := Label.new()
		total_label.text = "Total: +%d monedas" % total
		total_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
		total_label.add_theme_color_override("font_color", UiTheme.BONE)
		coins_column.add_child(total_label)

	return coins_column


func _on_rematch_pressed() -> void:
	_rematch_button.disabled = true
	_status_label.text = "Buscando rival…"
	_status_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.6))

	var ok: bool = await _director.rematch_online_race()

	# `rematch_online_race()` ya pudo arrancar la siguiente carrera (y con
	# ella, cerrar el menú/HUD de detrás) mientras esperábamos: si esta
	# pantalla ya no está en el árbol, no hay nada más que hacer.
	if not is_instance_valid(_rematch_button):
		return

	if ok:
		queue_free()
		return

	_rematch_button.disabled = false
	_status_label.text = "No se pudo encontrar rival. Inténtalo de nuevo."
	_status_label.add_theme_color_override("font_color", UiTheme.BAD)


func _find_player(participants: Array) -> Dictionary:
	for entry in participants:
		if str(entry.get("role", "")) == "PLAYER":
			return entry
	return {}
