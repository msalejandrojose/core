extends CanvasLayer

## Lobby de carrera en vivo (TASK-323, tarea 6): buscar partida en el
## circuito ya elegido en el menú, ver el estado de la cola y la cuenta
## atrás, y poder cancelar. Cuando la carrera arranca de verdad entrega el
## turno a `RaceDirector.start_live_race()` y se cierra sola.
##
## El renderizado en vivo de los rivales (sus coches en pista) y una
## pantalla de resultado con el podio son de la tarea 7 — aquí solo se llega
## hasta el instante justo antes de la cuenta atrás, que es el alcance de
## esta tarea.
##
## Tarjeta clara flotando sobre la escena 3D, mismo lenguaje que
## `track_select_screen.gd` — se abre desde el menú principal igual que esa.

signal closed()

enum _Phase { IDLE, SEARCHING, MATCHED, STARTING }

var _phase: int = _Phase.IDLE
## Slug real contra el que se busca partida — compone cilindrada/sentido/
## arquetipo, igual que `RacingApi.match_online_race(GameSettings.track_key())`
## en el modo asíncrono (`main_menu.gd`).
var _track_slug: String = ""

var _status_label: Label
var _players_label: Label
var _search_button: Button
var _cancel_button: Button
var _back_button: Button
var _countdown_timer: Timer
var _countdown_ms_left: int = 0


func _ready() -> void:
	layer = 9
	_track_slug = GameSettings.track_key()
	_build()

	LiveRaceSocket.room_update.connect(_on_room_update)
	LiveRaceSocket.countdown.connect(_on_countdown)
	LiveRaceSocket.race_started.connect(_on_race_started)
	LiveRaceSocket.connection_failed.connect(_on_connection_failed)

	_sync_phase()


func _exit_tree() -> void:
	# Salir de esta pantalla sin haber llegado a "arrancando" es abandonar la
	# búsqueda — sin esto el socket se quedaría abierto de fondo, en una sala
	# que ya no tiene pantalla que la escuche.
	if _phase == _Phase.SEARCHING or _phase == _Phase.MATCHED:
		LiveRaceSocket.leave()


func close_screen() -> void:
	closed.emit()
	queue_free()


func _build() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = UiTheme.ink_alpha(0.45)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var card := UiTheme.card_panel()
	card.custom_minimum_size = Vector2(560, 0)
	center.add_child(card)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 20)
	card.add_child(column)

	var title := Label.new()
	title.text = "Carrera en vivo"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	title.add_theme_color_override("font_color", UiTheme.CARD_INK)
	column.add_child(title)

	var track_label := Label.new()
	track_label.text = "Circuito: %s" % _track_display_name()
	track_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	track_label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	column.add_child(track_label)

	_status_label = Label.new()
	_status_label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	_status_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD
	column.add_child(_status_label)

	_players_label = Label.new()
	_players_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_players_label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	column.add_child(_players_label)

	var buttons_row := HBoxContainer.new()
	buttons_row.add_theme_constant_override("separation", 16)
	column.add_child(buttons_row)

	_back_button = UiTheme.pill_button("Atrás", UiTheme.STEEL, Color.WHITE)
	_back_button.pressed.connect(close_screen)
	buttons_row.add_child(_back_button)

	_search_button = UiTheme.pill_button("Buscar partida", UiTheme.BLUE, Color.WHITE)
	_search_button.pressed.connect(_on_search_pressed)
	buttons_row.add_child(_search_button)

	_cancel_button = UiTheme.pill_button("Cancelar", UiTheme.BAD, Color.WHITE)
	_cancel_button.pressed.connect(_on_cancel_pressed)
	buttons_row.add_child(_cancel_button)


## Duplicado a propósito de `main_menu.gd`/`track_select_screen.gd` — cada
## pantalla suelta ya repite este mismo patrón de tres líneas, no vale la
## pena centralizarlo por esto.
func _track_display_name() -> String:
	var id := GameSettings.track_id
	if TrackCatalog.ids().has(id):
		return TrackCatalog.by_id(id).name
	return id


func _on_search_pressed() -> void:
	_phase = _Phase.SEARCHING
	_sync_phase()
	LiveRaceSocket.connect_and_join(_track_slug)


func _on_cancel_pressed() -> void:
	LiveRaceSocket.leave()
	_phase = _Phase.IDLE
	_sync_phase()


func _on_room_update(_room_id: String, _status: String, player_ids: Array) -> void:
	if is_instance_valid(_players_label):
		_players_label.text = "%d jugador%s en la sala" % [
			player_ids.size(), "" if player_ids.size() == 1 else "es"]
	_sync_phase()


func _on_countdown(_room_id: String, ms: int) -> void:
	_phase = _Phase.MATCHED
	_countdown_ms_left = ms
	if not is_instance_valid(_countdown_timer):
		_countdown_timer = Timer.new()
		_countdown_timer.wait_time = 1.0
		_countdown_timer.timeout.connect(_on_countdown_tick)
		add_child(_countdown_timer)
	_countdown_timer.start()
	_sync_phase()


func _on_countdown_tick() -> void:
	_countdown_ms_left = maxi(0, _countdown_ms_left - 1000)
	_sync_phase()
	if _countdown_ms_left <= 0 and is_instance_valid(_countdown_timer):
		_countdown_timer.stop()


## El socket ya está conectado y en la sala cuando esto llega — sigue así en
## la carrera, `RaceDirector.start_live_race()` no lo vuelve a abrir.
func _on_race_started(_room_id: String, _start_at: int) -> void:
	_phase = _Phase.STARTING
	var director: Node = get_tree().get_first_node_in_group("race_director")
	close_screen()
	if director != null:
		director.start_live_race(_track_slug)


func _on_connection_failed(reason: String) -> void:
	_phase = _Phase.IDLE
	_sync_phase()
	if is_instance_valid(_status_label):
		_status_label.text = "No se pudo conectar: %s" % reason


func _sync_phase() -> void:
	if not is_instance_valid(_search_button):
		return

	_search_button.visible = _phase == _Phase.IDLE
	_cancel_button.visible = _phase == _Phase.SEARCHING or _phase == _Phase.MATCHED
	_players_label.visible = _phase == _Phase.SEARCHING or _phase == _Phase.MATCHED

	match _phase:
		_Phase.IDLE:
			_status_label.text = "Busca rivales reales para correr este circuito ahora mismo."
		_Phase.SEARCHING:
			_status_label.text = "Buscando rivales…"
		_Phase.MATCHED:
			_status_label.text = "¡Rivales encontrados! Arrancando en %ds…" % ceili(_countdown_ms_left / 1000.0)
		_Phase.STARTING:
			_status_label.text = "¡Ya!"
