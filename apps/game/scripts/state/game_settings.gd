extends Node

## Preferencias del jugador, guardadas en el dispositivo.
##
## Autoload registrado como `GameSettings` en project.godot.

const PATH := "user://settings.cfg"

enum ControlScheme {
	## Volante flotante analógico con acelerador y freno. El de TASK-197.
	WHEEL,
	## Se pulsa un lado u otro de la pantalla para girar y el gas va puesto.
	TAP,
}

signal changed()

var control_scheme: ControlScheme = ControlScheme.WHEEL
var reverse: bool = false
var track_id: String = TrackCatalog.DEFAULT_ID

## Dirección de la API elegida en Ajustes. Vacía = la del proyecto. Existe para
## poder apuntar a otro backend desde el propio móvil: recompilar y reinstalar
## solo para cambiar una URL es un ciclo demasiado lento.
var api_base_url: String = ""

var _cfg := ConfigFile.new()


func _ready() -> void:
	_cfg.load(PATH)
	control_scheme = _cfg.get_value("controls", "scheme", ControlScheme.WHEEL)
	reverse = _cfg.get_value("track", "reverse", false)
	track_id = _cfg.get_value("track", "id", TrackCatalog.DEFAULT_ID)
	api_base_url = _cfg.get_value("api", "base_url", "")
	# Un circuito que ya no existe (renombrado, retirado) no debe dejar el juego
	# sin pista: se cae al primero del catálogo.
	if not TrackCatalog.ids().has(track_id):
		track_id = TrackCatalog.DEFAULT_ID


func set_control_scheme(scheme: ControlScheme) -> void:
	if scheme == control_scheme:
		return
	control_scheme = scheme
	_cfg.set_value("controls", "scheme", scheme)
	_save()


func set_track_id(id: String) -> void:
	if id == track_id:
		return
	track_id = id
	_cfg.set_value("track", "id", id)
	_save()


func set_api_base_url(url: String) -> void:
	var clean := url.strip_edges()
	if clean == api_base_url:
		return
	api_base_url = clean
	_cfg.set_value("api", "base_url", clean)
	_save()


func set_reverse(value: bool) -> void:
	if value == reverse:
		return
	reverse = value
	_cfg.set_value("track", "reverse", value)
	_save()


## Clave de récord: circuito y sentido. Correr al revés es, a efectos de
## tiempos, otro circuito — una vuelta inversa no se puede comparar con una
## normal — así que cada combinación guarda su propia marca. En la API esto
## será una `Track` distinta por cada una.
func track_key() -> String:
	return key_for(track_id)


## Misma regla aplicada a un circuito cualquiera. Existe para que el sufijo de
## sentido se calcule en un único sitio: cuando el director tenía su propia
## concatenación, la sobreescritura de los tests se saltaba el "-rev" y el
## récord inverso acababa pisando al normal.
func key_for(id: String) -> String:
	return id + ("-rev" if reverse else "")


func _save() -> void:
	_cfg.save(PATH)
	changed.emit()
