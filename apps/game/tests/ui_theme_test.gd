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
