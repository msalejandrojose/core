extends Node

## Prueba de UiTheme (TASK-307/TASK-308): que make_button() monta un botón
## con el tamaño táctil y los overrides de color/estilo esperados, y que
## ink_alpha() no toca los canales RGB de INK.
##
##     godot --headless --quit-after 30 res://tests/ui_theme_test.tscn

var _failures := 0


func _ready() -> void:
	var button := UiTheme.make_button("Correr")
	_check(button.text, "Correr", "make_button() pone el texto")
	_check(
		button.custom_minimum_size == UiTheme.BUTTON_MIN_SIZE,
		true,
		"make_button() usa el tamaño mínimo táctil por defecto",
	)
	_check(
		button.get_theme_font_size("font_size") == UiTheme.BUTTON_FONT_SIZE,
		true,
		"make_button() usa el tamaño de fuente por defecto",
	)
	_check(
		button.get_theme_color("font_color") == UiTheme.BONE,
		true,
		"make_button() pinta el texto de BONE",
	)
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		_check(
			button.has_theme_stylebox(state),
			true,
			"make_button() define el estado '%s'" % state,
		)

	var custom := UiTheme.make_button("Ajustes", Vector2(300, 96), UiTheme.FONT_LG)
	_check(custom.custom_minimum_size == Vector2(300, 96), true, "make_button() respeta un tamaño a medida")
	_check(custom.get_theme_font_size("font_size") == UiTheme.FONT_LG, true, "make_button() respeta una fuente a medida")

	var translucent := UiTheme.ink_alpha(0.5)
	_check(translucent.r == UiTheme.INK.r and translucent.g == UiTheme.INK.g and translucent.b == UiTheme.INK.b, true, "ink_alpha() no toca el RGB de INK")
	_check(translucent.a, 0.5, "ink_alpha() aplica el alfa pedido")

	# --- Tarjetas claras (pase de diseño en Taller/Menú/Selección de circuito) --

	var card_box := UiTheme.card_stylebox()
	_check(card_box.bg_color, UiTheme.CARD, "card_stylebox() usa CARD por defecto")
	_check(card_box.corner_radius_top_left, UiTheme.CARD_CORNER_RADIUS, "card_stylebox() redondea las esquinas")
	_check(card_box.shadow_size > 0, true, "card_stylebox() lleva sombra")

	var selected_box := UiTheme.card_stylebox_selected(UiTheme.CLAY)
	_check(selected_box.border_color, UiTheme.CLAY, "card_stylebox_selected() pinta el borde del color pedido")
	_check(selected_box.border_width_left > 0, true, "y le da grosor de verdad")

	var card := UiTheme.card_panel()
	_check(card is PanelContainer, true, "card_panel() es un PanelContainer")
	_check(card.has_theme_stylebox_override("panel"), true, "con el estilo de tarjeta ya puesto")

	var pill := UiTheme.pill_button("Cambiar", UiTheme.GOOD)
	_check(pill.text, "Cambiar", "pill_button() pone el texto")
	for state in ["normal", "hover", "pressed", "focus", "disabled"]:
		_check(pill.has_theme_stylebox(state), true, "pill_button() define el estado '%s'" % state)
	_check(pill.get_theme_color("font_color"), Color.WHITE, "pill_button() usa el color de texto pedido")

	var pill_with_pressed := UiTheme.pill_button(
		"Modo", Color("e9e4d9"), UiTheme.CARD_INK, UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM, UiTheme.GOOD, Color.WHITE)
	_check(pill_with_pressed.get_theme_color("font_pressed_color"), Color.WHITE,
		"pill_button() acepta un color de texto distinto para el estado pulsado")

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _check(got, want, label: String) -> void:
	if got == want:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s (got=%s want=%s)" % [label, got, want])
		_failures += 1
