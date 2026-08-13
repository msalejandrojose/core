extends CanvasLayer

## Preferencias del jugador. Cambiar cualquier opción se guarda al momento y
## relanza la salida: el esquema de control altera la vuelta en curso, y dejarla
## viva daría un tiempo hecho a medias entre dos configuraciones.
##
## Circuito y sentido NO están aquí: son lo que eliges para jugar, no una
## preferencia, y viven en el menú principal. Tenerlos en dos sitios sería tener
## dos sitios donde mirar cuando algo no cuadra.

const BONE := Color("f0ece6")
const INK := Color(0.11, 0.098, 0.09)

signal closed()


func _ready() -> void:
	layer = 9
	_build()


func _build() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = Color(INK.r, INK.g, INK.b, 0.985)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 20)
	margin.add_child(column)

	column.add_child(_title("Ajustes"))

	column.add_child(_label("Controles", 30))
	column.add_child(_choice(
		["Volante", "Toque lateral"],
		1 if GameSettings.control_scheme == GameSettings.ControlScheme.TAP else 0,
		func(index: int) -> void: GameSettings.set_control_scheme(
			GameSettings.ControlScheme.TAP if index == 1 else GameSettings.ControlScheme.WHEEL)))
	column.add_child(_label(
		"Volante: arrastra el pulgar izquierdo para girar, pedales a la derecha.\n"
		+ "Toque lateral: pulsa un lado para girar, el acelerador va puesto.", 22))

	column.add_child(_label("Servidor", 30))

	# Editable desde el propio móvil: recompilar y reinstalar solo para cambiar
	# una URL es un ciclo demasiado lento cuando estás probando en dispositivo.
	var server := LineEdit.new()
	server.text = GameSettings.api_base_url
	server.placeholder_text = Api.base_url
	server.custom_minimum_size = Vector2(0, 80)
	server.add_theme_font_size_override("font_size", 26)
	server.text_submitted.connect(func(value: String) -> void:
		GameSettings.set_api_base_url(value))
	server.focus_exited.connect(func() -> void:
		GameSettings.set_api_base_url(server.text))
	column.add_child(server)

	column.add_child(_label(
		"Vacío usa el del juego (%s). Cambia esto si el backend está en otra máquina."
		% Api.base_url, 22))

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(spacer)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	column.add_child(row)

	row.add_child(_button("Licencias", func() -> void:
		add_child(load("res://scenes/ui/licenses-screen.tscn").instantiate())))

	var push := Control.new()
	push.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(push)

	row.add_child(_button("Cerrar", close_screen))


func close_screen() -> void:
	closed.emit()
	queue_free()


# --- Piezas -------------------------------------------------------------------

func _title(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 52)
	label.add_theme_color_override("font_color", BONE)
	return label


func _label(text: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", BONE * Color(1, 1, 1, 0.6 if font_size < 26 else 1.0))
	return label


## Grupo de botones excluyentes. Se usan botones grandes y no un OptionButton
## porque un desplegable en móvil obliga a dos toques y a apuntar a una lista.
func _choice(options: Array, selected: int, on_pick: Callable) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)

	var group := ButtonGroup.new()
	for i in options.size():
		var button := Button.new()
		button.text = options[i]
		button.toggle_mode = true
		button.button_group = group
		button.button_pressed = i == selected
		button.custom_minimum_size = Vector2(220, 80)
		button.add_theme_font_size_override("font_size", 30)
		var index := i
		button.pressed.connect(func() -> void: on_pick.call(index))
		row.add_child(button)

	return row


func _button(text: String, on_pressed: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(240, 96)
	button.add_theme_font_size_override("font_size", 32)
	button.pressed.connect(on_pressed)
	return button
