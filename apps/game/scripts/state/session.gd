extends Node

## Sesión del jugador contra el IAM de `core`.
##
## Autoload registrado como `Session` en project.godot.
##
## El token se guarda en el dispositivo y se rehidrata al arrancar: nadie va a
## escribir su contraseña cada vez que abre un juego de coches.

const PATH := "user://session.cfg"

## Godot no trae WebView ni deep links: el navegador del sistema es la única
## superficie disponible, así que se hace polling a la API en vez de esperar
## una redirección de vuelta al juego. 2s de por sí ya es discreto; la ventana
## de 3 minutos da margen a elegir cuenta o pasar por 2FA sin sensación de que
## el juego se quedó colgado esperando para siempre.
const GOOGLE_POLL_INTERVAL_S := 2.0
const GOOGLE_POLL_TIMEOUT_S := 180.0

signal changed()

var access_token: String = ""
var email: String = ""
## Id propio, para lo que necesita saber "quién soy yo" además de estar
## autenticado — p.ej. anunciarse como PLAYER en una carrera online
## (TASK-284/285).
var user_id: String = ""

var _cfg := ConfigFile.new()


func _ready() -> void:
	_cfg.load(PATH)
	access_token = _cfg.get_value("session", "access_token", "")
	email = _cfg.get_value("session", "email", "")
	user_id = _cfg.get_value("session", "user_id", "")
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
		"userType": "APP",
	}, false)
	_adopt(response)
	return response


## Abre el navegador del sistema para el consentimiento de Google y espera
## (con polling) a que el jugador complete el login ahí. Devuelve un
## `ApiResponse`-like: `{ok, code, message}` para que la pantalla de login
## pueda mostrar el mismo tipo de error que con login/register.
func login_with_google() -> Dictionary:
	var start = await Api.post_json("/auth/google/start", {}, false)
	if not start.ok or not (start.data is Dictionary):
		return {"ok": false, "code": "GOOGLE_START_FAILED",
			"message": "No se pudo iniciar el login con Google."}

	var session_id := str(start.data.get("sessionId", ""))
	var auth_url := str(start.data.get("authUrl", ""))
	if session_id == "" or auth_url == "":
		return {"ok": false, "code": "GOOGLE_START_FAILED",
			"message": "No se pudo iniciar el login con Google."}

	OS.shell_open(auth_url)

	var elapsed := 0.0
	while elapsed < GOOGLE_POLL_TIMEOUT_S:
		await get_tree().create_timer(GOOGLE_POLL_INTERVAL_S).timeout
		elapsed += GOOGLE_POLL_INTERVAL_S

		var poll = await Api.get_json("/auth/google/session/%s" % session_id, false)
		if not poll.ok or not (poll.data is Dictionary):
			continue

		var status := str(poll.data.get("status", "PENDING"))
		if status == "READY":
			_adopt(poll)
			return {"ok": true}
		if status == "FAILED":
			return {"ok": false, "code": "GOOGLE_AUTH_FAILED",
				"message": "No se pudo iniciar sesión con Google."}

	return {"ok": false, "code": "GOOGLE_AUTH_TIMEOUT",
		"message": "Se agotó el tiempo de espera del login con Google."}


func logout() -> void:
	access_token = ""
	email = ""
	user_id = ""
	Api.access_token = ""
	_cfg.set_value("session", "access_token", "")
	_cfg.set_value("session", "email", "")
	_cfg.set_value("session", "user_id", "")
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
	user_id = str(user.get("id", "")) if user is Dictionary else ""

	_cfg.set_value("session", "access_token", access_token)
	_cfg.set_value("session", "email", email)
	_cfg.set_value("session", "user_id", user_id)
	_cfg.save(PATH)
	changed.emit()

	# Entrar es el momento natural para soltar lo que quedó pendiente: puede
	# haber tiempos corridos sin cuenta o con la sesión caducada.
	LapQueue.flush()
