extends CanvasLayer

## Amigos: compartir tu código, añadir a alguien con el suyo, responder
## solicitudes recibidas y ver tu lista de amigos (TASK-258). TASK-222 ya
## define la mecánica (recíproca, con aceptación) y el backend — esto es
## solo la interfaz que le faltaba.
##
## Requiere cuenta: el código y las amistades viven en el servidor por
## jugador, así que sin sesión no hay nada que mostrar.

signal closed()

var _column: VBoxContainer
var _status: Label
var _code_label: Label
var _add_field: LineEdit
var _add_status: Label
var _requests_container: VBoxContainer
var _friends_container: VBoxContainer
var _all_buttons: Array[Button] = []


func _ready() -> void:
	layer = 9
	_build_shell()

	if not Session.is_logged_in():
		_show_locked()
		return

	await _load()


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

	_column.add_child(_title("Amigos"))

	_status = _label(
		"Comparte tu código para que alguien te añada, o introduce el suyo "
		+ "para pedirle amistad. Hace falta que la otra persona acepte.")
	_column.add_child(_status)


func _show_locked() -> void:
	_status.text = "Necesitas una cuenta para tener amigos: entra desde \"Cuenta\" en el menú."
	_status.add_theme_color_override("font_color", UiTheme.BAD)

	var row := HBoxContainer.new()
	_column.add_child(row)
	row.add_child(_button("Cerrar", close_screen))


func close_screen() -> void:
	closed.emit()
	queue_free()


# --- Carga -----------------------------------------------------------------

func _load() -> void:
	_status.text = _status.text + "\n\nCargando…"

	var code_response = await RacingApi.friend_code()
	if not code_response.ok or not (code_response.data is Dictionary):
		_status.text = "No se pudo cargar tu código. Comprueba la conexión e inténtalo de nuevo."
		_status.add_theme_color_override("font_color", UiTheme.BAD)
		_column.add_child(_button("Cerrar", close_screen))
		return

	_status.text = _status.text.replace("\n\nCargando…", "")
	_build_loaded(str(code_response.data.get("code", "")))

	await _refresh_requests()
	await _refresh_friends()


func _build_loaded(code: String) -> void:
	_column.add_child(_heading("Tu código"))

	var code_row := HBoxContainer.new()
	code_row.add_theme_constant_override("separation", 16)
	_column.add_child(code_row)

	_code_label = Label.new()
	_code_label.text = code
	_code_label.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	_code_label.add_theme_color_override("font_color", UiTheme.CLAY)
	code_row.add_child(_code_label)

	code_row.add_child(_button("Copiar", func() -> void: _copy_code()))

	_column.add_child(_heading("Añadir amigo"))

	var add_row := HBoxContainer.new()
	add_row.add_theme_constant_override("separation", 16)
	_column.add_child(add_row)

	_add_field = LineEdit.new()
	_add_field.placeholder_text = "Código del otro jugador"
	_add_field.custom_minimum_size = Vector2(320, 88)
	_add_field.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	_add_field.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	add_row.add_child(_add_field)

	add_row.add_child(_button("Añadir", func() -> void: _submit_add()))

	_add_status = _label("")
	_column.add_child(_add_status)

	_column.add_child(_heading("Solicitudes pendientes"))
	_requests_container = VBoxContainer.new()
	_requests_container.add_theme_constant_override("separation", 8)
	_column.add_child(_requests_container)

	_column.add_child(_heading("Tus amigos"))

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	_column.add_child(scroll)

	_friends_container = VBoxContainer.new()
	_friends_container.add_theme_constant_override("separation", 8)
	_friends_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_friends_container)

	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 16)
	_column.add_child(bottom)
	bottom.add_child(_button("Cerrar", close_screen))


func _copy_code() -> void:
	DisplayServer.clipboard_set(_code_label.text)
	_flash_add_status("Código copiado.", UiTheme.GOOD)


# --- Añadir amigo ------------------------------------------------------------

func _submit_add() -> void:
	var code := _add_field.text.strip_edges()
	if code == "":
		_flash_add_status("Escribe un código.", UiTheme.BAD)
		return

	_set_buttons_disabled(true)
	_flash_add_status("Enviando…", UiTheme.BONE)

	var response = await RacingApi.add_friend(code)

	_set_buttons_disabled(false)

	if not response.ok:
		_flash_add_status(
			response.message if not response.message.is_empty() else "No se pudo enviar la solicitud.",
			UiTheme.BAD)
		return

	_add_field.text = ""
	_flash_add_status("Solicitud enviada.", UiTheme.GOOD)


func _flash_add_status(text: String, color: Color) -> void:
	if not is_instance_valid(_add_status):
		return
	_add_status.text = text
	_add_status.add_theme_color_override("font_color", color)


# --- Solicitudes y amigos -----------------------------------------------------

func _refresh_requests() -> void:
	var response = await RacingApi.friend_requests()
	if not is_instance_valid(_requests_container):
		return

	for child in _requests_container.get_children():
		child.free()
	_forget_freed_buttons()

	var requests: Array = response.data if response.ok and response.data is Array else []
	if requests.is_empty():
		_requests_container.add_child(_label("No tienes solicitudes pendientes."))
		return

	for request in requests:
		_requests_container.add_child(_request_row(request))


func _request_row(request: Dictionary) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)

	var name_label := _label(str(request.get("requesterDisplayName", "?")))
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_label)

	var id: String = request.get("id", "")
	row.add_child(_button("Aceptar", func() -> void: _respond(id, true)))
	row.add_child(_button("Rechazar", func() -> void: _respond(id, false)))

	return row


func _respond(id: String, accept: bool) -> void:
	_set_buttons_disabled(true)
	await RacingApi.respond_friend_request(id, accept)
	_set_buttons_disabled(false)

	await _refresh_requests()
	if accept:
		await _refresh_friends()


func _refresh_friends() -> void:
	var response = await RacingApi.friends()
	if not is_instance_valid(_friends_container):
		return

	for child in _friends_container.get_children():
		child.free()
	_forget_freed_buttons()

	var friends: Array = response.data if response.ok and response.data is Array else []
	if friends.is_empty():
		_friends_container.add_child(
			_label("Aún no tienes amigos — comparte tu código o introduce uno."))
		return

	for friend in friends:
		_friends_container.add_child(_friend_row(friend))


## Fila de un amigo con botón para correr contra su fantasma (TASK-223): pide
## su mejor marca en el circuito ya elegido en el menú y, si tiene, arranca la
## carrera reutilizando `RaceDirector.start_online_race` — es la misma
## mecánica que un rival de emparejamiento (TASK-284/285), solo que aquí el
## jugador elige contra quién en vez de que lo decida el servidor.
func _friend_row(friend: Dictionary) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)

	var name_label := _label(str(friend.get("displayName", "?")))
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_label)

	var user_id: String = str(friend.get("userId", ""))
	var display_name: String = str(friend.get("displayName", "?"))
	var race_button := UiTheme.make_button("Correr")
	_all_buttons.append(race_button)
	race_button.pressed.connect(func() -> void: _race_against(user_id, display_name, race_button, name_label))
	row.add_child(race_button)

	return row


func _race_against(
	user_id: String,
	display_name: String,
	race_button: Button,
	name_label: Label,
) -> void:
	var director: RaceDirector = get_tree().get_first_node_in_group("race_director")
	if director == null:
		return

	_set_buttons_disabled(true)
	race_button.text = "Cargando…"

	var response = await RacingApi.friend_ghost(GameSettings.track_key(), user_id)

	if not is_instance_valid(race_button):
		return

	if not response.ok:
		_set_buttons_disabled(false)
		race_button.text = "Correr"
		name_label.text = "%s — no se pudo cargar su fantasma." % display_name
		return

	if response.data == null:
		_set_buttons_disabled(false)
		race_button.text = "Correr"
		name_label.text = "%s — todavía no tiene marca en este circuito." % display_name
		return

	var ghost: Dictionary = response.data
	close_screen()
	director.start_online_race(
		{
			"userId": user_id,
			"durationMs": ghost.get("durationMs", 0),
			"snapshots": ghost.get("snapshots", []),
		},
		{})


func _forget_freed_buttons() -> void:
	var alive: Array[Button] = []
	for button in _all_buttons:
		if is_instance_valid(button):
			alive.append(button)
	_all_buttons = alive


# --- Piezas -----------------------------------------------------------------------

func _title(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	label.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.7))
	return label


func _button(text: String, on_pressed: Callable) -> Button:
	var button := UiTheme.make_button(text)
	button.pressed.connect(on_pressed)
	_all_buttons.append(button)
	return button


func _set_buttons_disabled(disabled: bool) -> void:
	for button in _all_buttons:
		if is_instance_valid(button):
			button.disabled = disabled
