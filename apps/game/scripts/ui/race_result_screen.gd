extends CanvasLayer

## Resumen al completar una vuelta en solitario (TASK-260): tiempo final,
## delta contra la mejor marca propia, y posición en el leaderboard del
## circuito. Desde aquí se reinicia directamente, sin pasar por el menú.
##
## La posición pide red y puede tardar o no llegar nunca (sin conexión, sin
## cuenta): el resto de la pantalla no la espera — subir el tiempo ya es
## best-effort (TASK-205, cola offline), esto hereda el mismo criterio.

var _director: RaceDirector
var _position_label: Label


func _ready() -> void:
	layer = 9


## Se llama justo después de instanciar, en vez de construir desde `_ready`:
## quien la abre (`race_hud.gd`) ya tiene los datos de la vuelta a mano, y
## pasarlos como argumentos evita un segundo canal (señal o autoload) solo
## para esto.
func show_result(duration_ms: int, previous_best_ms: Variant, is_new_record: bool) -> void:
	_director = get_tree().get_first_node_in_group("race_director")
	VehicleInput.locked = true
	_build(duration_ms, previous_best_ms, is_new_record)
	_load_position()


func _build(duration_ms: int, previous_best_ms: Variant, is_new_record: bool) -> void:
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
	title.text = "Vuelta completada"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	title.add_theme_color_override("font_color", UiTheme.BONE)
	column.add_child(title)

	var hud_script := load("res://scripts/ui/race_hud.gd")

	var time_label := Label.new()
	time_label.text = hud_script.format_ms(duration_ms)
	time_label.add_theme_font_size_override("font_size", UiTheme.FONT_DISPLAY)
	time_label.add_theme_color_override("font_color", UiTheme.CLAY)
	column.add_child(time_label)

	var delta_label := Label.new()
	delta_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	if is_new_record:
		delta_label.text = "¡Nuevo récord!"
		delta_label.add_theme_color_override("font_color", UiTheme.GOOD)
	elif previous_best_ms != null:
		var delta: int = duration_ms - int(previous_best_ms)
		delta_label.text = "%s respecto a tu mejor marca" % hud_script.format_delta_ms(delta)
		delta_label.add_theme_color_override("font_color", UiTheme.GOOD if delta < 0 else UiTheme.BAD)
	else:
		delta_label.text = "Primera vez que corres esta combinación de circuito, sentido y cilindrada."
		delta_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.7))
	column.add_child(delta_label)

	_position_label = Label.new()
	_position_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_position_label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.6))
	_position_label.text = (
		"Consultando tu posición…" if Session.is_logged_in()
		else "Entra con una cuenta para salir en la clasificación.")
	column.add_child(_position_label)

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

	var restart_button := UiTheme.make_button(
		"Reiniciar", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_LG)
	restart_button.pressed.connect(func() -> void:
		queue_free()
		_director.restart())
	row.add_child(restart_button)


func _load_position() -> void:
	if not Session.is_logged_in():
		return

	var response = await RacingApi.leaderboard(_director.record_key(), 1)
	# La pantalla puede haberse cerrado (Reiniciar/Menú) antes de que
	# conteste la red: la posición es un extra, no algo que valga la pena
	# esperar a mostrar bloqueando el resto.
	if not is_instance_valid(_position_label):
		return

	if not response.ok or not (response.data is Dictionary):
		_position_label.text = "No se pudo consultar tu posición."
		return

	var position = response.data.get("yourPosition")
	_position_label.text = (
		"Posición en el circuito: #%s" % str(position) if position != null
		else "Todavía no tienes un tiempo válido subido en este circuito.")
