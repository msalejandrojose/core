extends Node

## Login nativo de plataforma: Google Play Games Services (Android) y Game
## Center (iOS). Autoload registrado como `PlatformAuth` en project.godot.
##
## Cada función comprueba que el singleton del addon esté disponible
## (`Engine.has_singleton`) antes de tocarlo, y no lanza si algo falla — vacío
## ("" / {}) significa "no disponible o falló", igual de válido en el editor,
## en desktop, o si el addon todavía no está instalado, que en un fallo real
## del SDK nativo.
##
## IMPORTANTE — nombres best-effort: los nombres de singleton/método/señal de
## abajo son la mejor lectura de la documentación pública de
## godot-sdk-integrations/godot-play-game-services y
## godot-sdk-integrations/godot-ios-plugins (plugin `gamecenter`) al escribir
## esto. Instalar el addon de verdad es un paso manual fuera de este entorno
## (hace falta Android Studio/Play Console para uno, Xcode/Apple Developer
## para el otro) — en cuanto se instale, revisar estos nombres contra el
## código real del addon y ajustar si hace falta. El resto del sistema
## (`Session`, `login_screen`) solo depende de la forma pública de este
## archivo (`request_play_games_server_auth_code`/`request_game_center_identity_payload`),
## así que un ajuste aquí no debería tocar nada más.

const PLAY_GAMES_SINGLETON := "GodotPlayGameServices"
const GAME_CENTER_SINGLETON := "GameCenter"

## Cuánto se espera como máximo a que el plugin nativo responda antes de darlo
## por fallido — evita colgar el botón de login si el SDK nunca dispara su
## señal (p.ej. el jugador cierra el diálogo del sistema sin elegir nada).
const NATIVE_TIMEOUT_S := 20.0


func is_play_games_available() -> bool:
	return Engine.has_singleton(PLAY_GAMES_SINGLETON)


func is_game_center_available() -> bool:
	return Engine.has_singleton(GAME_CENTER_SINGLETON)


## Pide sign-in + server auth code a Play Games Services v2. Vacío si el
## addon no está disponible, si el jugador cancela, o si el SDK falla.
func request_play_games_server_auth_code() -> String:
	if not is_play_games_available():
		return ""

	var plugin := Engine.get_singleton(PLAY_GAMES_SINGLETON)
	if not (plugin.has_signal("signed_in") and plugin.has_method("sign_in")):
		return ""

	plugin.sign_in()
	var signed_in_ok: bool = await AwaitSignal.first_or_timeout(
		self, plugin, "signed_in", NATIVE_TIMEOUT_S)
	if not signed_in_ok:
		return ""

	if not (plugin.has_signal("server_side_access_granted") and plugin.has_method("request_server_side_access")):
		return ""

	# `false`: no hace falta refresh_token, esto es login de un solo uso —
	# el access_token de servidor se canjea y se tira en el momento (ver
	# `PlayGamesAuthVerifier` en el backend).
	plugin.request_server_side_access(false)
	var code: Variant = await AwaitSignal.first_or_timeout(
		self, plugin, "server_side_access_granted", NATIVE_TIMEOUT_S)
	return str(code) if code != null else ""


## Pide autenticación + firma de identidad a Game Center. Vacío si el addon
## no está disponible, si el jugador cancela, o si el SDK falla.
func request_game_center_identity_payload() -> Dictionary:
	if not is_game_center_available():
		return {}

	var plugin := Engine.get_singleton(GAME_CENTER_SINGLETON)
	if not (plugin.has_signal("authenticated") and plugin.has_method("authenticate")):
		return {}

	plugin.authenticate()
	var auth_ok: bool = await AwaitSignal.first_or_timeout(
		self, plugin, "authenticated", NATIVE_TIMEOUT_S)
	if not auth_ok:
		return {}

	if not (plugin.has_signal("identity_verification_signature_received") and plugin.has_method("request_identity_verification_signature")):
		return {}

	plugin.request_identity_verification_signature()
	var raw: Variant = await AwaitSignal.first_or_timeout(
		self, plugin, "identity_verification_signature_received", NATIVE_TIMEOUT_S)
	if not (raw is Dictionary):
		return {}

	var data: Dictionary = raw
	return {
		"playerId": str(data.get("playerId", data.get("player_id", ""))),
		"bundleId": str(data.get("bundleId", data.get("bundle_id", ""))),
		"timestamp": int(data.get("timestamp", 0)),
		"signature": str(data.get("signature", "")),
		"salt": str(data.get("salt", "")),
		"publicKeyUrl": str(data.get("publicKeyUrl", data.get("public_key_url", ""))),
	}
