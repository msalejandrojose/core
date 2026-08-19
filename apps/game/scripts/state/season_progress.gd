extends Node

## Cierre y rotación automática de temporada, lado cliente (TASK-228): el
## servidor rota solo (cada hora, si toca), así que aquí no hay nada que
## disparar — solo NOTAR que pasó y contárselo al jugador. Un reset
## silencioso se vive como perder los tiempos, no como empezar de cero.
##
## Guardado local, mismo criterio que RaceRecords/Achievements: recuerda la
## última temporada vista en ESTE dispositivo. Si al preguntar por la
## temporada actual resulta ser otra distinta, la que recordábamos se acaba
## de cerrar — ahí se enseña el aviso, con la posición del jugador en ella.
##
## Autoload registrado como `SeasonProgress` en project.godot.

const PATH := "user://season_progress.cfg"

var _cfg := ConfigFile.new()

var _panel: CanvasLayer
var _message_label: Label


func _ready() -> void:
	_cfg.load(PATH)


## Se llama una vez, al montar el menú principal — no hace falta más de una
## vez por sesión, la temporada no rota mientras la partida está abierta a
## ese ritmo (cada hora en servidor, TASK-228).
func check(track_key: String) -> void:
	var response = await RacingApi.current_season()
	if not response.ok or not (response.data is Dictionary):
		return

	var current_id: String = str(response.data.get("id", ""))
	if current_id.is_empty():
		return

	var last_seen: String = str(_cfg.get_value("state", "last_season_id", ""))

	if last_seen.is_empty():
		# Primera vez que esto corre en este dispositivo: no hay "temporada
		# anterior" que contar, solo empezar a recordar desde ahora.
		_remember(current_id)
		return

	if last_seen == current_id:
		return

	# La temporada rotó: `last_seen` es la que se acaba de cerrar.
	if Session.is_logged_in():
		await _show_recap(track_key, last_seen)

	_remember(current_id)


func _remember(season_id: String) -> void:
	_cfg.set_value("state", "last_season_id", season_id)
	_cfg.save(PATH)


func _show_recap(track_key: String, closed_season_id: String) -> void:
	var response = await RacingApi.leaderboard(track_key, 1, closed_season_id)
	if not response.ok or not (response.data is Dictionary):
		return

	var position: Variant = response.data.get("yourPosition")
	var message: String
	if position is int or position is float:
		message = "🏁 Temporada anterior: acabaste en el puesto %d de este circuito." % int(position)
	else:
		message = "🏁 Empieza una temporada nueva — no llegaste a marcar tiempo en la anterior en este circuito."

	_build_panel(message)


func _build_panel(message: String) -> void:
	_panel = CanvasLayer.new()
	_panel.layer = 16
	add_child(_panel)

	var backdrop := ColorRect.new()
	backdrop.color = UiTheme.ink_alpha(0.7)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	_panel.add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	_panel.add_child(center)

	var card := UiTheme.card_panel(UiTheme.CARD, UiTheme.CARD_CORNER_RADIUS, 32)
	center.add_child(card)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 24)
	column.custom_minimum_size = Vector2(520, 0)
	card.add_child(column)

	var title := Label.new()
	title.text = "Nueva temporada"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_LG)
	title.add_theme_color_override("font_color", UiTheme.CARD_INK)
	column.add_child(title)

	_message_label = Label.new()
	_message_label.text = message
	_message_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_message_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_message_label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	column.add_child(_message_label)

	var close_button := UiTheme.pill_button("Vale", UiTheme.GOOD, Color.WHITE)
	close_button.pressed.connect(_close_panel)
	column.add_child(close_button)


func _close_panel() -> void:
	if is_instance_valid(_panel):
		_panel.queue_free()
	_panel = null


## Solo para tests: vuelve a "recién instalado".
func clear() -> void:
	if _cfg.has_section("state"):
		_cfg.erase_section("state")
		_cfg.save(PATH)
