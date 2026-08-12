extends Node

## Cola de tiempos pendientes de subir. Autoload registrado como `LapQueue`.
##
## El teléfono pierde red a mitad de vuelta, o el jugador corre en el metro. El
## cronómetro nunca depende del servidor, así que el tiempo existe igual: lo que
## hace falta es que no se pierda por el camino.
##
## Sobrevive a cerrar la app: se guarda en disco al encolar y al vaciar, no solo
## en memoria. Un jugador que cierra el juego tras su mejor vuelta del día no
## puede perderla.

const PATH := "user://pending_laps.cfg"

## Cada cuánto se reintenta. Corto no ayuda: si no hay red, no hay red.
const RETRY_INTERVAL_S := 20.0

## Tope de la cola. Sin él, meses sin conexión llenarían el disco. Al pasarse se
## tiran los MÁS ANTIGUOS: un tiempo viejo importa menos que el de hoy.
const MAX_PENDING := 200

signal changed()

var _pending: Array = []
var _sending := false
var _elapsed := 0.0


func _ready() -> void:
	_load()


func _process(delta: float) -> void:
	if _pending.is_empty() or _sending or not Session.is_logged_in():
		return

	_elapsed += delta
	if _elapsed < RETRY_INTERVAL_S:
		return

	_elapsed = 0.0
	flush()


func pending_count() -> int:
	return _pending.size()


## Encola un tiempo y trata de subirlo ya. Se guarda ANTES de intentarlo: si la
## app muere a mitad del envío, el tiempo sigue estando.
func enqueue(track_key: String, duration_ms: int, splits_ms: Array) -> void:
	_pending.append({
		"track": track_key,
		"duration_ms": duration_ms,
		"splits_ms": splits_ms,
	})

	while _pending.size() > MAX_PENDING:
		_pending.pop_front()

	_save()
	changed.emit()
	flush()


## Intenta subir todo lo pendiente, en orden.
func flush() -> void:
	if _sending or _pending.is_empty() or not Session.is_logged_in():
		return

	_sending = true

	while not _pending.is_empty():
		var lap: Dictionary = _pending[0]
		var response = await RacingApi.submit_lap(
			lap["track"], lap["duration_ms"], lap["splits_ms"])

		if response.ok:
			_pending.pop_front()
			continue

		# Un fallo de red es temporal: se deja la cola tal cual y se reintenta
		# luego. Si además la sesión ha caducado, tampoco tiene sentido seguir
		# gastando peticiones hasta que el jugador vuelva a entrar.
		if response.is_network_error() or response.is_unauthorized():
			break

		# Cualquier otro rechazo es definitivo: el servidor ya ha dicho que ese
		# tiempo no le vale, y reintentarlo mil veces no lo va a cambiar. Se
		# descarta para no atascar la cola con algo que nunca va a entrar.
		push_warning("Tiempo descartado (%s): %s" % [response.code, response.message])
		_pending.pop_front()

	_sending = false
	_save()
	changed.emit()


func clear() -> void:
	_pending.clear()
	_save()
	changed.emit()


# --- Persistencia -------------------------------------------------------------

func _load() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	var stored: Variant = cfg.get_value("queue", "laps", [])
	_pending = stored if stored is Array else []


func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("queue", "laps", _pending)
	cfg.save(PATH)
