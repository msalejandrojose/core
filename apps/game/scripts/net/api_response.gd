extends RefCounted

## Resultado de una llamada a la API.
##
## Se devuelve siempre, también cuando falla: en un juego una llamada rota no
## puede tumbar la partida, así que nada de excepciones. Quien llama mira `ok`.

var ok: bool
var status: int
var data: Variant
## Código del catálogo de errores de la API, o "NETWORK" si no llegó a hablar
## con el servidor. Es lo que permite reaccionar distinto a un rechazo del
## anti-cheat que a una sesión caducada.
var code: String
var message: String


static func success(p_status: int, p_data: Variant):
	var response = new()
	response.ok = true
	response.status = p_status
	response.data = p_data
	response.code = ""
	response.message = ""
	return response


static func failure(p_status: int, p_code: String, p_message: String):
	var response = new()
	response.ok = false
	response.status = p_status
	response.data = null
	response.code = p_code
	response.message = p_message
	return response


## Un fallo de red es distinto de un rechazo del servidor: el primero se
## reintenta, el segundo no tiene sentido reintentarlo igual.
func is_network_error() -> bool:
	return code == "NETWORK"


## La sesión ya no vale y hay que volver a entrar.
func is_unauthorized() -> bool:
	return status == 401
