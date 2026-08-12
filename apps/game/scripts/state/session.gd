extends Node

## Sesión del jugador contra el IAM de `core`.
##
## Autoload registrado como `Session` en project.godot.
##
## El token se guarda en el dispositivo y se rehidrata al arrancar: nadie va a
## escribir su contraseña cada vez que abre un juego de coches.

const PATH := "user://session.cfg"

signal changed()

var access_token: String = ""
var email: String = ""

var _cfg := ConfigFile.new()


func _ready() -> void:
	_cfg.load(PATH)
	access_token = _cfg.get_value("session", "access_token", "")
	email = _cfg.get_value("session", "email", "")
	Api.access_token = access_token


func is_logged_in() -> bool:
	return access_token != ""


func login(p_email: String, password: String):
	var response = await Api.post_json(
		"/auth/login", {"email": p_email, "password": password}, false)
	_adopt(response)
	return response


func register(p_email: String, password: String, first_name: String):
	var response = await Api.post_json("/auth/register", {
		"email": p_email,
		"password": password,
		"firstName": first_name,
	}, false)
	_adopt(response)
	return response


func logout() -> void:
	access_token = ""
	email = ""
	Api.access_token = ""
	_cfg.set_value("session", "access_token", "")
	_cfg.set_value("session", "email", "")
	_cfg.save(PATH)
	changed.emit()


func _adopt(response) -> void:
	if not response.ok or not (response.data is Dictionary):
		return

	var token := str(response.data.get("accessToken", ""))
	if token == "":
		return

	access_token = token
	Api.access_token = token

	var user: Variant = response.data.get("user")
	email = str(user.get("email", "")) if user is Dictionary else ""

	_cfg.set_value("session", "access_token", access_token)
	_cfg.set_value("session", "email", email)
	_cfg.save(PATH)
	changed.emit()
