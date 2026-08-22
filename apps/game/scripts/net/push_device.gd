extends Node

## Token de push del dispositivo (Firebase Cloud Messaging), para registrarlo
## contra `POST /me/devices`. Autoload registrado como `PushDevice` en
## project.godot.
##
## A diferencia de `PlatformAuth`/`DeepLink`, aquí NO hay un único addon
## "oficial" elegido todavía — TASK-252 solo decidió la VÍA ("plugin nativo
## de FCM"), no un addon concreto, y el panorama de plugins de FCM para
## Godot 4 está fragmentado (varias opciones de calidad/mantenimiento
## dispares, sin un ganador claro como sí lo hay para Play Games/Game
## Center/deep links). Por eso se prueban varios nombres de singleton
## plausibles en vez de uno solo — y aun así, sea cual sea el que se acabe
## eligiendo, hay que revisar/ajustar esto contra su API real.
##
## TASK-253 está además marcada como bloqueada explícitamente hasta que
## exista un proyecto de Firebase real (credenciales, `google-services.json`/
## `GoogleService-Info.plist`) — sin eso no hay token real que obtener ni
## dispositivo real donde verificarlo. Este archivo deja el cableado listo
## para cuando llegue ese momento; hasta entonces se degrada con gracia
## (vacío, nunca lanza), igual que el resto del sistema en esta misma
## situación.

signal token_received(token: String)

## Candidatos de nombre de singleton, en orden de preferencia — el primero
## que exista se usa. Reducir a uno solo en cuanto se elija el addon real.
const CANDIDATE_SINGLETONS := ["FirebaseMessaging", "GodotFirebaseMessaging", "FCM"]

const NATIVE_TIMEOUT_S := 10.0

var _plugin: Object = null


func _ready() -> void:
	for candidate in CANDIDATE_SINGLETONS:
		if Engine.has_singleton(candidate):
			_plugin = Engine.get_singleton(candidate)
			break


func is_available() -> bool:
	return _plugin != null


## Pide el token de push actual. Vacío ("") si no hay plugin disponible, si
## el jugador denegó el permiso, o si el SDK falla — nunca lanza.
func request_push_token() -> String:
	if _plugin == null:
		return ""

	if not (_plugin.has_signal("token_received") and _plugin.has_method("get_token")):
		return ""

	_plugin.get_token()
	var result: Variant = await AwaitSignal.first_or_timeout(
		self, _plugin, "token_received", NATIVE_TIMEOUT_S)
	return str(result) if result != null else ""
