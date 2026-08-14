extends Node

## Cliente HTTP contra la API de `core`.
##
## Autoload registrado como `Api` en project.godot.
##
## Todo devuelve un `ApiResponse` en vez de lanzar: en un juego, una llamada que
## falla nunca puede tumbar la partida. El coche sigue corriendo aunque no haya
## red, y quien llama decide qué hacer con el fallo.

const ApiResponse := preload("res://scripts/net/api_response.gd")

## Dónde vive la API. Se lee de los ajustes del proyecto para poder apuntar a
## otra máquina sin tocar código — en un móvil real, `localhost` es el propio
## teléfono, así que hay que poner la IP del ordenador en la red local.
const BASE_URL_SETTING := "racing/api/base_url"
const DEFAULT_BASE_URL := "http://localhost:3000/v1"

## Un tiempo de vuelta que tarda más de esto en subir no interesa reintentarlo
## en caliente: se encola y se sube luego.
const TIMEOUT_S := 10.0

var base_url: String = DEFAULT_BASE_URL

## Token de sesión. Lo pone `Session`; el cliente solo lo adjunta.
var access_token: String = ""


func _ready() -> void:
	refresh_base_url()
	GameSettings.changed.connect(refresh_base_url)


## Lo elegido en Ajustes manda sobre el valor del proyecto.
func refresh_base_url() -> void:
	var configured := ""
	if ProjectSettings.has_setting(BASE_URL_SETTING):
		configured = str(ProjectSettings.get_setting(BASE_URL_SETTING))

	base_url = GameSettings.api_base_url if GameSettings.api_base_url != "" else configured
	if base_url == "":
		base_url = DEFAULT_BASE_URL


func get_json(path: String, authorized: bool = true) -> ApiResponse:
	return await _request(HTTPClient.METHOD_GET, path, {}, authorized, false)


func post_json(path: String, body: Dictionary, authorized: bool = true) -> ApiResponse:
	return await _request(HTTPClient.METHOD_POST, path, body, authorized, true)


func patch_json(path: String, body: Dictionary, authorized: bool = true) -> ApiResponse:
	return await _request(HTTPClient.METHOD_PATCH, path, body, authorized, true)


# --- Interno ------------------------------------------------------------------

func _request(
	method: int,
	path: String,
	body: Dictionary,
	authorized: bool,
	send_body: bool,
) -> ApiResponse:
	var http := HTTPRequest.new()
	http.timeout = TIMEOUT_S
	add_child(http)

	var headers := PackedStringArray(["Content-Type: application/json"])
	if authorized and access_token != "":
		headers.append("Authorization: Bearer %s" % access_token)

	var payload := JSON.stringify(body) if send_body else ""
	var error := http.request(base_url + path, headers, method, payload)

	if error != OK:
		http.queue_free()
		return ApiResponse.failure(0, "NETWORK", "No se pudo abrir la conexión.")

	var result: Array = await http.request_completed
	http.queue_free()

	# result = [result, response_code, headers, body]
	var outcome: int = result[0]
	var status: int = result[1]
	var raw: PackedByteArray = result[3]

	if outcome != HTTPRequest.RESULT_SUCCESS:
		return ApiResponse.failure(
			status, "NETWORK", "Sin conexión con el servidor.")

	var parsed: Variant = null
	if raw.size() > 0:
		parsed = JSON.parse_string(raw.get_string_from_utf8())

	if status >= 200 and status < 300:
		return ApiResponse.success(status, parsed)

	# La API devuelve `{ code, message }` con su catálogo de errores. Se
	# conserva el `code` porque es lo que permite reaccionar distinto a un
	# rechazo del anti-cheat que a una sesión caducada.
	var code := "HTTP_%d" % status
	var message := "Error del servidor."
	if parsed is Dictionary:
		code = str(parsed.get("code", code))
		message = str(parsed.get("message", message))

	return ApiResponse.failure(status, code, message)
