extends CanvasLayer

## Entrar o crear cuenta contra el IAM de `core`.
##
## Con email y contraseña, o con Google (abre el navegador del sistema y
## espera a que el jugador complete el consentimiento ahí — Godot no trae
## WebView ni deep links, así que no hay vuelta directa a la app).

const BONE := Color("f0ece6")
const INK := Color(0.11, 0.098, 0.09)
const BAD := Color("c4544a")
const GOOD := Color("4c9a68")

signal closed()

var _email: LineEdit
var _password: LineEdit
var _status: Label
var _buttons: Array[Button] = []


func _ready() -> void:
	layer = 9
	_build()


func _build() -> void:
	var backdrop := ColorRect.new()
	# Opaco del todo: detrás está el menú, y no hay nada que previsualizar
	# mientras escribes una contraseña.
	backdrop.color = INK
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 18)
	margin.add_child(column)

	var title := Label.new()
	title.text = "Tu cuenta"
	title.add_theme_font_size_override("font_size", 52)
	title.add_theme_color_override("font_color", BONE)
	column.add_child(title)

	var intro := Label.new()
	intro.text = "La cuenta sirve para subir tus tiempos y salir en la clasificación. Puedes jugar sin ella: los tiempos se guardan en este dispositivo."
	intro.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	intro.add_theme_font_size_override("font_size", 24)
	intro.add_theme_color_override("font_color", BONE * Color(1, 1, 1, 0.6))
	column.add_child(intro)

	_email = _field("Email", false)
	_email.text = Session.email
	column.add_child(_email)

	_password = _field("Contraseña", true)
	column.add_child(_password)

	_status = Label.new()
	_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_status.add_theme_font_size_override("font_size", 24)
	column.add_child(_status)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(spacer)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 16)
	column.add_child(row)

	# Jugar sin cuenta ya funcionaba, pero con el botón llamado "Cerrar" no lo
	# parecía: cerrar no promete nada, y quien no quiere registrarse necesita
	# ver una salida clara antes de plantearse abandonar.
	row.add_child(_button("Jugar sin cuenta", 340, func() -> void: _close()))

	var push := Control.new()
	push.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(push)

	row.add_child(_button("Entrar con Google", 320, func() -> void: _submit_google()))
	row.add_child(_button("Crear cuenta", 280, func() -> void: _submit(true)))
	row.add_child(_button("Entrar", 240, func() -> void: _submit(false)))


func _field(placeholder: String, secret: bool) -> LineEdit:
	var edit := LineEdit.new()
	edit.placeholder_text = placeholder
	edit.secret = secret
	edit.custom_minimum_size = Vector2(0, 88)
	edit.add_theme_font_size_override("font_size", 30)
	return edit


func _button(text: String, width: int, on_pressed: Callable) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = Vector2(width, 96)
	button.add_theme_font_size_override("font_size", 30)
	button.pressed.connect(on_pressed)
	_buttons.append(button)
	return button


# --- Acciones -----------------------------------------------------------------

func _submit(create: bool) -> void:
	var email := _email.text.strip_edges()
	if email == "" or _password.text == "":
		_say("Rellena email y contraseña.", BAD)
		return

	# Se bloquean los botones mientras va la llamada: dos toques seguidos
	# lanzarían dos registros y el segundo fallaría con un error confuso.
	_set_busy(true)
	_say("Conectando…", BONE)

	var response = (
		await Session.register(email, _password.text, email.split("@")[0])
		if create
		else await Session.login(email, _password.text))

	_set_busy(false)

	if response.ok:
		_say("Listo. Tus tiempos ya se suben.", GOOD)
		await get_tree().create_timer(0.8).timeout
		_close()
		return

	# El mensaje del servidor es mejor que uno inventado aquí: sabe si es
	# contraseña incorrecta, email ya registrado o cuenta sin verificar.
	if response.is_network_error():
		_say("No hay conexión con el servidor. Puedes seguir corriendo: los tiempos se guardan y se subirán luego.", BAD)
	else:
		_say(response.message, BAD)


func _submit_google() -> void:
	_set_busy(true)
	_say("Abriendo el navegador para entrar con Google…", BONE)

	var response: Dictionary = await Session.login_with_google()

	_set_busy(false)

	if response.get("ok", false):
		_say("Listo. Tus tiempos ya se suben.", GOOD)
		await get_tree().create_timer(0.8).timeout
		_close()
		return

	_say(str(response.get("message", "No se pudo iniciar sesión con Google.")), BAD)


func _set_busy(busy: bool) -> void:
	for button in _buttons:
		button.disabled = busy


func _say(text: String, color: Color) -> void:
	_status.text = text
	_status.add_theme_color_override("font_color", color)


func _close() -> void:
	closed.emit()
	queue_free()
