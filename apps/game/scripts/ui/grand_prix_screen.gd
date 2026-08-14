extends CanvasLayer

## Correr un Grand Prix (TASK-250): elegir uno, encadenar sus circuitos sin
## volver al menú principal entre manga y manga, con resultado parcial al
## terminar cada una y resultado final + clasificación al terminar la última.
##
## Requiere cuenta: el intento vive en el servidor por jugador, igual que el
## taller.
##
## Se queda viva (oculta) durante toda la carrera de cada manga: la pantalla
## de carreras (`RaceDirector`) la tapa, y reaparece al cruzar meta para
## mostrar el resultado. Por eso no se destruye entre mangas, solo al volver
## de verdad al menú.

signal closed()

var _column: VBoxContainer
var _status: Label
var _director: RaceDirector

var _busy: bool = false

## Grand Prix elegido: {id, slug, name, isActive, stages:[{trackId, trackSlug, trackName, order}]}.
var _gp: Dictionary = {}
## Manga que se acaba de correr, para poder reintentar el envío si falla.
var _current_track_id: String = ""


func _ready() -> void:
	layer = 9
	_director = get_tree().get_first_node_in_group("race_director")
	_director.grand_prix_stage_completed.connect(_on_stage_completed)
	# Cubre tanto abandonar a mitad como el "Menú" del resultado final: los
	# dos vuelven al menú desde Grand Prix, y `open_menu()` es quien decide
	# cuándo emitir esto (ver `RaceDirector`).
	_director.grand_prix_ended.connect(close_screen)

	_build_shell()

	if not Session.is_logged_in():
		_show_locked()
		return

	_load_list()


func _build_shell() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = UiTheme.ink_alpha(0.985)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	_column = VBoxContainer.new()
	_column.add_theme_constant_override("separation", 16)
	margin.add_child(_column)

	_column.add_child(_title("Grand Prix"))

	_status = _label("Cargando…")
	_column.add_child(_status)


func _show_locked() -> void:
	_status.text = "Necesitas una cuenta para correr un Grand Prix: entra desde \"Cuenta\" en el menú."
	_status.add_theme_color_override("font_color", UiTheme.BAD)
	_add_close_button()


func close_screen() -> void:
	closed.emit()
	queue_free()


# --- Elegir Grand Prix ---------------------------------------------------------

func _load_list() -> void:
	var response = await RacingApi.grand_prix_list()
	if not response.ok or not (response.data is Array):
		_fail("No se pudo cargar la lista de Grand Prix.")
		return

	_status.text = "Elige un Grand Prix:"

	var items: Array = response.data
	if items.is_empty():
		_column.add_child(_label("Todavía no hay ningún Grand Prix activo."))
	else:
		for item in items:
			if item is Dictionary:
				_column.add_child(_gp_row(item))

	_add_close_button()


func _gp_row(item: Dictionary) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)

	var stage_count: int = (item.get("stages", []) as Array).size()
	var label := _label("%s — %d circuitos" % [str(item.get("name", "?")), stage_count])
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(label)

	var play := UiTheme.make_button("Correr", Vector2(160, 88), UiTheme.FONT_SM)
	var gp_id: String = str(item.get("id", ""))
	play.pressed.connect(func() -> void: _start_or_resume(gp_id))
	row.add_child(play)

	return row


func _start_or_resume(gp_id: String) -> void:
	if _busy:
		return
	_busy = true
	_status.text = "Cargando circuito…"

	var gp_response = await RacingApi.grand_prix(gp_id)
	var attempt_response = await RacingApi.grand_prix_start_or_resume(gp_id)

	_busy = false

	if not gp_response.ok or not (gp_response.data is Dictionary) \
		or not attempt_response.ok or not (attempt_response.data is Dictionary):
		_fail("No se pudo arrancar el Grand Prix. Comprueba la conexión e inténtalo de nuevo.")
		return

	_gp = gp_response.data
	await _play_stage(str(attempt_response.data.get("nextTrackId", "")))


# --- Correr una manga -----------------------------------------------------------

func _play_stage(track_id: String) -> void:
	var stage := _stage_by_track_id(track_id)
	if stage.is_empty():
		_fail("No se encontró la siguiente manga.")
		return

	_status.text = "Descargando %s…" % str(stage.get("trackName", ""))

	var slug: String = str(stage.get("trackSlug", ""))
	var layout: TrackCatalog.Layout = await TrackCache.get_or_fetch(slug)
	if layout == null:
		_fail("No se pudo descargar el circuito. Comprueba la conexión e inténtalo de nuevo.")
		return

	_current_track_id = track_id
	# El sentido de la manga es del servidor (va en el slug), no la
	# preferencia guardada del jugador — ver `TASK-247`/seed-racing.ts.
	var reversed := slug.contains("-rev-") or slug.ends_with("-rev")

	visible = false
	_director.start_grand_prix_stage(str(_gp.get("id", "")), layout, reversed)


func _stage_by_track_id(track_id: String) -> Dictionary:
	for stage in (_gp.get("stages", []) as Array):
		if stage is Dictionary and str(stage.get("trackId", "")) == track_id:
			return stage
	return {}


# --- Entre mangas y resultado final ---------------------------------------------

func _on_stage_completed(duration_ms: int) -> void:
	# El coche sigue "vivo" al cruzar meta: sin esto seguiría respondiendo al
	# mando detrás de la pantalla de resultado.
	VehicleInput.locked = true
	visible = true

	_clear_column()
	_column.add_child(_title("Grand Prix"))
	_status = _label("Subiendo el resultado…")
	_column.add_child(_status)

	var response = await RacingApi.grand_prix_submit_stage(
		str(_gp.get("id", "")), _current_track_id, duration_ms)

	if not response.ok or not (response.data is Dictionary):
		_status.text = "No se pudo subir el resultado de la manga."
		_status.add_theme_color_override("font_color", UiTheme.BAD)
		var retry := UiTheme.make_button("Reintentar")
		retry.pressed.connect(func() -> void: _on_stage_completed(duration_ms))
		_column.add_child(retry)
		return

	var attempt: Dictionary = response.data
	var next_track_id := str(attempt.get("nextTrackId", ""))

	if next_track_id == "":
		await _show_final_result(attempt)
	else:
		_show_stage_result(duration_ms, next_track_id)


func _show_stage_result(duration_ms: int, next_track_id: String) -> void:
	_clear_column()
	_column.add_child(_title("Manga completada"))

	var time_label := _label("Tiempo: %s" % _format_ms(duration_ms))
	time_label.add_theme_color_override("font_color", UiTheme.CLAY)
	_column.add_child(time_label)

	var next_stage := _stage_by_track_id(next_track_id)
	var next_button := UiTheme.make_button(
		"Siguiente: %s" % str(next_stage.get("trackName", "")))
	next_button.pressed.connect(func() -> void: _play_stage(next_track_id))
	_column.add_child(next_button)


func _show_final_result(attempt: Dictionary) -> void:
	_clear_column()
	_column.add_child(_title("Grand Prix completado"))

	var total := int(attempt.get("totalDurationMs", 0))
	var total_label := _label("Tiempo total: %s" % _format_ms(total))
	total_label.add_theme_color_override("font_color", UiTheme.CLAY)
	_column.add_child(total_label)

	var leaderboard_response = await RacingApi.grand_prix_leaderboard(str(_gp.get("id", "")))
	if leaderboard_response.ok and leaderboard_response.data is Dictionary:
		var entries: Array = leaderboard_response.data.get("entries", [])
		for entry in entries:
			if entry is Dictionary:
				_column.add_child(_label("#%s  %s  %s" % [
					str(entry.get("position", "")),
					str(entry.get("displayName", "")),
					_format_ms(int(entry.get("totalDurationMs", 0))),
				]))

	# No hace falta cerrar la pantalla aquí a mano: `open_menu()` detecta que
	# sigue en Grand Prix y emite `grand_prix_ended`, que ya está conectado a
	# `close_screen`.
	var menu_button := UiTheme.make_button("Menú")
	menu_button.pressed.connect(_director.open_menu)
	_column.add_child(menu_button)


# --- Piezas -----------------------------------------------------------------------

func _fail(message: String) -> void:
	_status.text = message
	_status.add_theme_color_override("font_color", UiTheme.BAD)
	_add_close_button()


func _add_close_button() -> void:
	var close := UiTheme.make_button("Cerrar")
	close.pressed.connect(close_screen)
	_column.add_child(close)


func _clear_column() -> void:
	for child in _column.get_children():
		child.free()


func _title(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _format_ms(ms: int) -> String:
	var script := load("res://scripts/ui/race_hud.gd")
	return script.format_ms(ms)
