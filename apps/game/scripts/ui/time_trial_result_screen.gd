extends CanvasLayer

## Resumen al completar un contrarreloj de 3 vueltas (TASK-312): tiempo total
## y el desglose de cada vuelta. Sin posición en el leaderboard ni delta
## contra ninguna marca — este modo no compite en la clasificación normal,
## es su propio resultado (ver comentario de `RaceDirector._time_trial_*`).

var _director: RaceDirector


func _ready() -> void:
	layer = 9


## Se llama justo después de instanciar, igual que `RaceResultScreen` — quien
## la abre (`race_hud.gd`) ya tiene los datos del intento a mano.
func show_result(total_ms: int, lap_times_ms: Array) -> void:
	_director = get_tree().get_first_node_in_group("race_director")
	VehicleInput.locked = true
	_build(total_ms, lap_times_ms)


func _build(total_ms: int, lap_times_ms: Array) -> void:
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
	title.text = "Contrarreloj completado"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	title.add_theme_color_override("font_color", UiTheme.BONE)
	column.add_child(title)

	var hud_script := load("res://scripts/ui/race_hud.gd")

	var time_label := Label.new()
	time_label.text = hud_script.format_ms(total_ms)
	time_label.add_theme_font_size_override("font_size", UiTheme.FONT_DISPLAY)
	time_label.add_theme_color_override("font_color", UiTheme.CLAY)
	column.add_child(time_label)

	var subtitle := Label.new()
	subtitle.text = "Tiempo total — %d vueltas" % lap_times_ms.size()
	subtitle.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	subtitle.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.7))
	column.add_child(subtitle)

	for i in lap_times_ms.size():
		var lap_label := Label.new()
		lap_label.text = "Vuelta %d — %s" % [i + 1, hud_script.format_ms(lap_times_ms[i])]
		lap_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
		lap_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.85))
		column.add_child(lap_label)

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

	# "Otra vez" arranca un intento nuevo desde cero (`start_time_trial()`),
	# no un `restart()` suelto — ese solo repetiría la vuelta en la que
	# estuviera, y aquí ya no hay ninguna en curso.
	var again_button := UiTheme.make_button(
		"Otra vez", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_LG)
	again_button.pressed.connect(func() -> void:
		queue_free()
		_director.start_time_trial())
	row.add_child(again_button)
