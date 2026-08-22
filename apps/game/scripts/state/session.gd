extends Node

## Sesión del jugador contra el IAM de `core`.
##
## Autoload registrado como `Session` en project.godot.
##
## El token se guarda en el dispositivo y se rehidrata al arrancar: nadie va a
## escribir su contraseña cada vez que abre un juego de coches.

const ApiResponse := preload("res://scripts/net/api_response.gd")

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
##
## La página de callback del backend trae un botón "Volver al juego"
## (deep link `ajracing://auth/google-callback`) — si el SO lo entrega
## (Android/iOS con el addon instalado), se comprueba al instante en vez de
## esperar al siguiente tick de polling. Sin el deep link (desktop, o el
## addon todavía no instalado) el polling normal sigue detectándolo igual,
## solo que un poco más tarde — el deep link es un atajo, no un reemplazo.
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
		await _await_poll_tick_or_google_deep_link()
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


## Login nativo con Play Games Services (Android). A diferencia de
## `login_with_google()` no hace falta navegador ni polling: el SDK nativo da
## el `serverAuthCode` directamente, así que es tan simple como
## `login()`/`register()`.
func login_with_play_games():
	var code := await PlatformAuth.request_play_games_server_auth_code()
	if code == "":
		return ApiResponse.failure(0, "PLATFORM_AUTH_UNAVAILABLE",
			"No se pudo entrar con Play Games en este dispositivo.")

	var response = await Api.post_json(
		"/auth/play-games", {"serverAuthCode": code}, false)
	_adopt(response)
	return response


## Login nativo con Game Center (iOS). Mismo patrón que `login_with_play_games()`.
func login_with_game_center():
	var payload := await PlatformAuth.request_game_center_identity_payload()
	if payload.is_empty():
		return ApiResponse.failure(0, "PLATFORM_AUTH_UNAVAILABLE",
			"No se pudo entrar con Game Center en este dispositivo.")

	var response = await Api.post_json("/auth/game-center", payload, false)
	_adopt(response)
	return response


## Espera lo que llegue antes: `GOOGLE_POLL_INTERVAL_S` de reloj, o que
## `DeepLink` avise de que llegó el "Volver al juego" de la página de
## callback — así un toque en ese enlace no tiene que esperar al siguiente
## tick de 2s para comprobarse. Sin `DeepLink` (o sin el addon instalado)
## esto se comporta exactamente como el simple `create_timer` de antes.
func _await_poll_tick_or_google_deep_link() -> void:
	# Array, no un bool suelto: una lambda de GDScript captura variables
	# locales POR VALOR, así que reasignar `woken` dentro de `on_link` no se
	# vería desde este bucle si fuera un local simple (mismo motivo que en
	# `platform_auth.gd::_await_signal_or_timeout`).
	var woken := [false]
	var on_link := func(path: String, _query: Dictionary) -> void:
		if path == DeepLink.GOOGLE_CALLBACK_PATH:
			woken[0] = true
	DeepLink.link_received.connect(on_link, CONNECT_ONE_SHOT)

	var timer := get_tree().create_timer(GOOGLE_POLL_INTERVAL_S)
	while not woken[0] and timer.time_left > 0.0:
		await get_tree().process_frame

	if DeepLink.link_received.is_connected(on_link):
		DeepLink.link_received.disconnect(on_link)


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
