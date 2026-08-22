extends Node

## Deep links entrantes: el SO trae el juego al primer plano vía un enlace
## (p.ej. `ajracing://auth/google-callback?state=...`, al volver del
## consentimiento de Google en el navegador). Autoload registrado como
## `DeepLink` en project.godot.
##
## Envuelve el addon `godot-sdk-integrations/godot-deeplink` con la misma
## guarda de disponibilidad que `platform_auth.gd`: sin el addon instalado,
## esta clase no hace nada — nunca emite `link_received`, pero tampoco lanza.
## Desktop/editor/CI siguen funcionando exactamente igual que hoy.
##
## IMPORTANTE — nombres best-effort: el nombre del singleton (`Deeplink`), sus
## propiedades (`scheme`/`host`/`path_prefix`) y su señal
## (`deeplink_received`) son la mejor lectura de la documentación pública del
## addon al escribir esto — instalarlo de verdad es un paso manual fuera de
## este entorno (hace falta compilar contra Android/iOS reales). En cuanto se
## instale, revisar estos nombres contra el código real y ajustar si hace
## falta; el resto del juego solo depende de la señal `link_received` de
## aquí, así que un ajuste no debería tocar nada más.

signal link_received(path: String, query: Dictionary)

const DEEPLINK_SINGLETON := "Deeplink"

## `ajracing://auth/google-callback?state=...` — con `host = "auth"` fijado
## más abajo, lo que llega en `url.get_path()` es la parte DESPUÉS del host,
## o sea "/google-callback". El propio `state` (sessionId) viaja en la query
## por si hace falta para depurar, pero nadie lo necesita para nada:
## `session.gd` ya tiene su `session_id` en memoria desde antes de abrir el
## navegador — la señal en sí es lo único que importa.
const GOOGLE_CALLBACK_PATH := "/google-callback"

var _plugin: Object = null


func is_available() -> bool:
	return _plugin != null


func _ready() -> void:
	if not Engine.has_singleton(DEEPLINK_SINGLETON):
		return

	var plugin := Engine.get_singleton(DEEPLINK_SINGLETON)
	if not (plugin.has_method("initialize") and plugin.has_signal("deeplink_received")):
		return

	plugin.set("scheme", "ajracing")
	plugin.set("host", "auth")
	plugin.connect("deeplink_received", _on_deeplink_received)
	plugin.initialize()
	_plugin = plugin


func _on_deeplink_received(url: Object) -> void:
	if url == null or not url.has_method("get_path"):
		return

	var path := str(url.get_path())
	var query := {}
	if url.has_method("get_query"):
		query = _parse_query(str(url.get_query()))

	link_received.emit(path, query)


## `a=1&b=2` → `{"a": "1", "b": "2"}`. Sin `%`-decodificar a mano: `String.uri_decode()`
## ya existe en Godot para esto.
func _parse_query(raw: String) -> Dictionary:
	var result := {}
	if raw == "":
		return result

	for pair in raw.split("&"):
		if pair == "":
			continue
		var kv := pair.split("=", true, 1)
		var key: String = kv[0].uri_decode()
		var value: String = kv[1].uri_decode() if kv.size() > 1 else ""
		if key != "":
			result[key] = value

	return result
