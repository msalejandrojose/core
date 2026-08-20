extends CanvasLayer

## Podio real al terminar una carrera EN VIVO (TASK-323, tarea 7) — a
## diferencia de `RaceResultScreen` (vuelta suelta en solitario), aquí puede
## haber más de un corredor de verdad, y el resultado ya viene resuelto del
## servidor (`LiveRaceRoomManager.finalize()`): esta pantalla solo lo pinta,
## no recalcula nada.
##
## Mismo lenguaje visual que `RaceResultScreen` (fondo oscuro casi opaco,
## `layer = 9`) — sin "Reiniciar": no tiene sentido repetir una carrera que
## ya emparejó a gente de verdad, solo "Menú".

var _director: RaceDirector


func _ready() -> void:
	layer = 9


## Se llama justo después de instanciar, igual que `RaceResultScreen`.
## `result`/`rating_changes` son tal cual llegan del evento `race-finished`
## de `LiveRaceSocket`.
func show_result(result: Array, rating_changes: Array) -> void:
	_director = get_tree().get_first_node_in_group("race_director")
	VehicleInput.locked = true
	_build(result, rating_changes)


func _build(result: Array, rating_changes: Array) -> void:
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

	var rating_by_user: Dictionary = {}
	for change in rating_changes:
		if change is Dictionary:
			rating_by_user[str(change.get("userId", ""))] = change

	var podium := VBoxContainer.new()
	podium.add_theme_constant_override("separation", 8)
	column.add_child(podium)

	for entry in result:
		if entry is Dictionary:
			podium.add_child(_row(entry, rating_by_user.get(str(entry.get("userId", "")))))

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(spacer)

	var menu_button := UiTheme.make_button(
		"Menú", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_LG)
	menu_button.pressed.connect(func() -> void:
		queue_free()
		_director.open_menu())
	column.add_child(menu_button)


## Sin resolución de nombre por `userId` todavía (queda para una tarea
## aparte, no es de esta): "Tú" para el propio jugador es lo único que se
## puede afirmar con certeza — el resto se enseñan como "Rival", no se
## inventa un nombre que no se tiene.
func _row(entry: Dictionary, rating_change: Variant) -> Control:
	var is_me := str(entry.get("userId", "")) == Session.user_id
	var disconnected := bool(entry.get("disconnected", false))
	var hud_script := load("res://scripts/ui/race_hud.gd")

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)

	var position_label := Label.new()
	position_label.custom_minimum_size = Vector2(80, 0)
	position_label.text = "—" if disconnected else "#%s" % str(entry.get("position", "-"))
	position_label.add_theme_font_size_override("font_size", UiTheme.FONT_LG)
	position_label.add_theme_color_override("font_color", UiTheme.CLAY if is_me else UiTheme.BONE)
	row.add_child(position_label)

	var name_label := Label.new()
	name_label.text = "Tú" if is_me else "Rival"
	name_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	name_label.add_theme_color_override("font_color", UiTheme.BONE)
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_label)

	var time_label := Label.new()
	time_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	if disconnected:
		time_label.text = "No terminó"
		time_label.add_theme_color_override("font_color", UiTheme.BAD)
	else:
		var delta_ms := int(entry.get("deltaMs", 0))
		time_label.text = (
			hud_script.format_ms(int(entry.get("durationMs", 0))) if delta_ms == 0
			else hud_script.format_delta_ms(delta_ms))
		time_label.add_theme_color_override("font_color", UiTheme.BONE)
	row.add_child(time_label)

	if is_me and rating_change is Dictionary:
		var delta: int = int((rating_change as Dictionary).get("delta", 0))
		var rating_label := Label.new()
		rating_label.custom_minimum_size = Vector2(80, 0)
		rating_label.text = "%s%d" % ["+" if delta >= 0 else "", delta]
		rating_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
		rating_label.add_theme_color_override("font_color", UiTheme.GOOD if delta >= 0 else UiTheme.BAD)
		row.add_child(rating_label)

	return row
