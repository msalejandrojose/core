class_name PauseMenu extends CanvasLayer

## Menú de pausa (TASK-259): antes eran 3 botones sueltos flotando en la
## esquina de la carrera (Reiniciar/Ajustes/Menú, montados a mano en
## `race_hud.gd`) — pensados para cuando lo único que había era un circuito
## y nada más que hacer. Ahora un solo botón de pausa lo abre, y la carrera
## queda de verdad congelada mientras está abierto (crono y coche), no solo
## tapada por encima: hoy, sin esto, se podía abrir Ajustes y el coche
## seguía corriendo detrás.
##
## Paleta oscura de `UiTheme.make_button()`, no las tarjetas claras de
## menú/taller/selección — este menú vive DENTRO de la carrera, mismo
## lenguaje visual que el resto del HUD.

var _director: RaceDirector
var _lap_timer: LapTimer


## Deja la carrera congelada y se construye. Mismo mecanismo que ya usa
## `RaceDirector.open_menu()` para el semáforo/mando (`VehicleInput.locked`
## + `set_process(false)`) — no hace falta inventar uno nuevo.
func open(director: RaceDirector, lap_timer: LapTimer) -> void:
	_director = director
	_lap_timer = lap_timer
	layer = 12

	VehicleInput.locked = true
	_director.set_process(false)
	_lap_timer.pause()

	_build()


func _build() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = UiTheme.ink_alpha(0.85)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 20)
	center.add_child(column)

	var title := Label.new()
	title.text = "Pausa"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	title.add_theme_color_override("font_color", UiTheme.BONE)
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(title)

	var resume_button := UiTheme.make_button("Reanudar", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_LG)
	resume_button.pressed.connect(_resume)
	column.add_child(resume_button)

	var restart_button := UiTheme.make_button("Reiniciar", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_MD)
	restart_button.pressed.connect(_restart)
	column.add_child(restart_button)

	var settings_button := UiTheme.make_button("Ajustes", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_MD)
	settings_button.pressed.connect(_open_settings)
	column.add_child(settings_button)

	var menu_button := UiTheme.make_button("Menú principal", Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_MD)
	menu_button.pressed.connect(_open_main_menu)
	column.add_child(menu_button)


func _resume() -> void:
	_lap_timer.resume()
	_director.set_process(true)
	VehicleInput.locked = false
	queue_free()


func _restart() -> void:
	# `restart()` rearma el semáforo y vuelve a bloquear el mando por su
	# cuenta (`begin_countdown`) — no hace falta reanudar el crono antes,
	# `restart()` ya lo deja en su sitio (`set_reversed` → `abort()`).
	_director.set_process(true)
	_director.restart()
	queue_free()


func _open_settings() -> void:
	add_child(load("res://scenes/ui/settings-screen.tscn").instantiate())


func _open_main_menu() -> void:
	# `open_menu()` ya deja process/mando en su sitio por su cuenta — solo
	# hace falta soltar el crono antes de que se pierda esta referencia.
	_lap_timer.resume()
	_director.open_menu()
	queue_free()
