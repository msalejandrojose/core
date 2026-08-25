extends Node

## Preferencias del jugador, guardadas en el dispositivo.
##
## Autoload registrado como `GameSettings` en project.godot.

const PATH := "user://settings.cfg"

## Cilindrada. Un tiempo a 150cc no es comparable con uno a 50cc, igual que no
## lo es una vuelta al revés: cada una tiene su propia clasificación.
enum EngineClass {
	CC50,
	CC100,
	CC150,
}

## Multiplicador de velocidad punta de cada clase.
const ENGINE_SPEED := {
	EngineClass.CC50: 0.72,
	EngineClass.CC100: 1.0,
	EngineClass.CC150: 1.32,
}

const ENGINE_NAMES := {
	EngineClass.CC50: "50cc",
	EngineClass.CC100: "100cc",
	EngineClass.CC150: "150cc",
}


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
## true si `track_id` es el slug de un circuito del servidor (creado en el
## backoffice), no un id de los 4 del catálogo local. Esos circuitos son una
## única fila con un único slug — no tienen variantes de cilindrada/sentido/
## arquetipo — así que `track_key()` no compone nada encima, usa el slug tal
## cual.
var track_is_server: bool = false

## Dirección de la API elegida en Ajustes. Vacía = la del proyecto. Existe para
## poder apuntar a otro backend desde el propio móvil: recompilar y reinstalar
## solo para cambiar una URL es un ciclo demasiado lento.
var api_base_url: String = ""

var engine_class: EngineClass = EngineClass.CC100

var _cfg := ConfigFile.new()


func _ready() -> void:
	_cfg.load(PATH)
	control_scheme = _cfg.get_value("controls", "scheme", ControlScheme.WHEEL)
	# `reverse` NO se restaura de disco a propósito: el menú ya no tiene
	# control de Sentido, así que un `true` guardado por una versión anterior
	# dejaría al jugador corriendo al revés para siempre, sin forma de
	# volver, y además mandando sus tiempos a otra clasificación
	# (`track_key()` mete "-rev"). Arranca siempre en Normal. Si algún día
	# vuelve el control, esta línea y la de `set_reverse()` se restauran
	# juntas. Grand Prix no depende de esto: lleva su propio
	# `_grand_prix_reverse` en `race_director.gd`.
	# Con guarda: `erase_section_key()` da error si la clave no está, que es
	# el caso normal en una instalación limpia.
	if _cfg.has_section_key("track", "reverse"):
		_cfg.erase_section_key("track", "reverse")
		_cfg.save(PATH)
	track_id = _cfg.get_value("track", "id", TrackCatalog.DEFAULT_ID)
	track_is_server = _cfg.get_value("track", "is_server", false)
	api_base_url = _cfg.get_value("api", "base_url", "")
	engine_class = _cfg.get_value("race", "engine_class", EngineClass.CC100)
	# `track_id` puede ser un id del catálogo local o el slug de un circuito
	# del servidor (creado en el backoffice) — ese segundo caso no se puede
	# validar aquí sin red, así que solo se cae al primero del catálogo si de
	# verdad no hay nada guardado.
	if track_id.is_empty():
		track_id = TrackCatalog.DEFAULT_ID
		track_is_server = false


func set_control_scheme(scheme: ControlScheme) -> void:
	if scheme == control_scheme:
		return
	control_scheme = scheme
	_cfg.set_value("controls", "scheme", scheme)
	_save()


func set_track_id(id: String, is_server: bool = false) -> void:
	if id == track_id and is_server == track_is_server:
		return
	track_id = id
	track_is_server = is_server
	_cfg.set_value("track", "id", id)
	_cfg.set_value("track", "is_server", is_server)
	_save()


func set_api_base_url(url: String) -> void:
	var clean := url.strip_edges()
	if clean == api_base_url:
		return
	api_base_url = clean
	_cfg.set_value("api", "base_url", clean)
	_save()


func set_engine_class(value: EngineClass) -> void:
	if value == engine_class:
		return
	engine_class = value
	_cfg.set_value("race", "engine_class", value)
	_save()


func engine_speed() -> float:
	return ENGINE_SPEED[engine_class]


func engine_name() -> String:
	return ENGINE_NAMES[engine_class]


## Solo en memoria, sin persistir — ver el motivo en `_ready()`. Sigue
## existiendo porque las carreras leen `reverse` (`race_director.gd`) y los
## tests lo usan para cubrir la vuelta inversa.
func set_reverse(value: bool) -> void:
	if value == reverse:
		return
	reverse = value
	changed.emit()


## Clave de récord: circuito y sentido. Correr al revés es, a efectos de
## tiempos, otro circuito — una vuelta inversa no se puede comparar con una
## normal — así que cada combinación guarda su propia marca. En la API esto
## será una `Track` distinta por cada una.
##
## Un circuito del servidor (`track_is_server`) es una única fila con un
## único slug — no tiene variantes de cilindrada/sentido/arquetipo que
## componer encima, así que se usa el slug tal cual.
func track_key() -> String:
	if track_is_server:
		return track_id
	return key_for(track_id)


## Misma regla aplicada a un circuito cualquiera. Existe para que la clave se
## componga en un único sitio: cuando el director tenía su propia concatenación,
## la sobreescritura de los tests se saltaba el "-rev" y el récord inverso
## acababa pisando al normal.
##
## Entran circuito, sentido, cilindrada Y arquetipo (TASK-233), porque los
## cuatro cambian el tiempo. Un 150cc contra un 50cc no es una comparación, y
## un F1 contra un 4x4 tampoco — cada uno es otro juego. Las piezas equipadas
## NO entran (decisión TASK-269): afectan al tiempo pero no fragmentan más la
## clasificación.
##
## Compone SIEMPRE — lo usan tanto el circuito real como `track_id_override`
## de los tests, que también esperan la composición aunque su id no esté en
## `TrackCatalog`. Para circuitos del servidor (sin variantes de cc/sentido/
## arquetipo) la clave sin componer se resuelve en `track_key()`, que sí sabe
## si el `track_id` actual es del catálogo local o no (ver `track_is_server`).
func key_for(id: String) -> String:
	return "%s%s-%s-%s" % [id, "-rev" if reverse else "", engine_name(), CarLoadout.archetype_code]


func _save() -> void:
	_cfg.save(PATH)
	changed.emit()
