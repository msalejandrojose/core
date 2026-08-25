extends Node

## Mejores marcas guardadas en el dispositivo.
##
## Es deliberadamente local y tonto: el HUD necesita un récord contra el que
## comparar mucho antes de que exista la API. Cuando llegue el leaderboard esto
## no se tira, se convierte en la caché offline — el crono nunca debe depender
## de que haya red.
##
## Autoload registrado como `RaceRecords` en project.godot.

const PATH := "user://records.cfg"

signal record_set(track_id: String, duration_ms: int)

var _cfg := ConfigFile.new()


func _ready() -> void:
	# Que no exista todavía es lo normal en el primer arranque, no un error.
	_cfg.load(PATH)


func has_best(track_id: String) -> bool:
	return best_ms(track_id) > 0


func best_ms(track_id: String) -> int:
	return _cfg.get_value(track_id, "best_ms", 0)


## Splits acumulados de la vuelta récord. Vacío si aún no hay récord.
func best_splits(track_id: String) -> Array:
	return _cfg.get_value(track_id, "best_splits", [])


## Instantáneas de posición/rotación de la vuelta récord, para reproducirla
## como fantasma (TASK-220). Vacío si aún no hay récord.
func best_ghost(track_id: String) -> Array:
	return _cfg.get_value(track_id, "best_ghost", [])


## Cuántas marcas propias hay guardadas en total — una por cada combinación
## de circuito/sentido/cilindrada/arquetipo con récord (TASK-276: es el
## contador más barato de "el jugador progresa" que ya existe, sin distinguir
## qué circuito es cada una).
func recorded_count() -> int:
	return _cfg.get_sections().size()


## Registra una vuelta. Devuelve true si ha batido el récord.
func submit(track_id: String, duration_ms: int, splits_ms: Array, ghost_snapshots: Array = []) -> bool:
	if duration_ms <= 0:
		return false

	var previous := best_ms(track_id)
	if previous > 0 and duration_ms >= previous:
		return false

	_cfg.set_value(track_id, "best_ms", duration_ms)
	_cfg.set_value(track_id, "best_splits", splits_ms)
	_cfg.set_value(track_id, "best_ghost", ghost_snapshots)
	_cfg.save(PATH)
	record_set.emit(track_id, duration_ms)
	return true


## Solo para tests y para un futuro "borrar mis datos" en ajustes.
func clear(track_id: String) -> void:
	if _cfg.has_section(track_id):
		_cfg.erase_section(track_id)
		_cfg.save(PATH)
