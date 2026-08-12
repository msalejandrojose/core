class_name RaceDirector extends Node

## Pega el cronómetro, el coche y las marcas guardadas. El HUD solo escucha.

signal restarted()
signal record_beaten(duration_ms: int)
## `has_reference` es false mientras no haya récord contra el que comparar:
## el HUD debe mostrar el sector sin delta en vez de un "+0.000" mentiroso.
signal sector_delta(checkpoint: int, delta_ms: int, has_reference: bool)
## Luces encendidas de `LIGHT_COUNT`. Al llegar a todas, sale el GO.
signal countdown_changed(lights_on: int, total: int)
signal countdown_finished()

const LIGHT_COUNT := 3
## Intervalo entre luces. La cuenta dura un intervalo más que luces hay: las
## tres se encienden y la salida es el paso siguiente, así que la tercera llega
## a verse encendida. Total 2,4 s.
##
## Corto a propósito: en un contrarreloj se reinicia constantemente, y una
## salida larga se convierte en peaje en cuanto llevas veinte intentos.
const LIGHT_INTERVAL_S := 0.6
## Margen para que la comparación de floats no se coma el último paso cuando el
## delta acumulado se queda en 1,79999 en vez de 1,8.
const _EPSILON := 0.0001

## Solo para los tests: fuerza la clave de récord y deja fuera al catálogo,
## para que un arnés no escriba en la marca real de un circuito del juego.
@export var track_id_override: String = ""
@export var vehicle_path: NodePath = ^"../Vehicle"
@export var lap_timer_path: NodePath = ^"../LapTimer"
@export var track_builder_path: NodePath = ^"../TrackBuilder"

var vehicle: Vehicle
var lap_timer: LapTimer
var track_builder: TrackBuilder

var counting_down: bool = false
var _countdown_elapsed: float = 0.0
var _lights_on: int = 0


func _ready() -> void:
	vehicle = get_node(vehicle_path)
	lap_timer = get_node(lap_timer_path)
	track_builder = get_node(track_builder_path)

	lap_timer.sector_completed.connect(_on_sector_completed)
	lap_timer.lap_completed.connect(_on_lap_completed)

	# Con semáforo, arrancar el crono es decisión del director. Dejar además el
	# arranque por acelerón haría que el crono empezara antes que la carrera.
	lap_timer.auto_start_on_throttle = false

	GameSettings.changed.connect(_on_settings_changed)

	rebuild_track()
	restart()


func _process(delta: float) -> void:
	if not counting_down:
		return

	_countdown_elapsed += delta

	var lights := clampi(int(_countdown_elapsed / LIGHT_INTERVAL_S + _EPSILON), 0, LIGHT_COUNT)
	if lights != _lights_on:
		_lights_on = lights
		countdown_changed.emit(_lights_on, LIGHT_COUNT)

	if _countdown_elapsed + _EPSILON >= countdown_duration():
		_release()


## Salida parada con semáforo. Todas las vueltas empiezan igual, que es lo que
## hace que los tiempos de un contrarreloj se puedan comparar entre sí.
func begin_countdown() -> void:
	counting_down = true
	_countdown_elapsed = 0.0
	_lights_on = 0
	VehicleInput.locked = true
	lap_timer.abort()
	countdown_changed.emit(0, LIGHT_COUNT)


func countdown_duration() -> float:
	return (LIGHT_COUNT + 1) * LIGHT_INTERVAL_S


func _release() -> void:
	counting_down = false
	_countdown_elapsed = 0.0
	VehicleInput.locked = false
	lap_timer.start()
	countdown_finished.emit()


func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_R:
		restart()
		get_viewport().set_input_as_handled()


## Clave bajo la que se guarda el récord: circuito y sentido.
func record_key() -> String:
	if track_id_override.is_empty():
		return GameSettings.track_key()
	return GameSettings.key_for(track_id_override)


## Levanta el circuito seleccionado y engancha el cronómetro a sus puertas.
## Solo hace falta al arrancar y al cambiarlo en ajustes; reiniciar una vuelta
## no reconstruye nada, que por eso es instantáneo.
func rebuild_track() -> void:
	track_builder.build(TrackCatalog.by_id(GameSettings.track_id))
	lap_timer.rescan()


## Reinicio rápido. No recarga la escena ni reconstruye la pista: recoloca el
## coche y reinicia el estado. Es el gesto más usado de un contrarreloj, así
## que tiene que ser instantáneo — una pantalla de carga aquí mataría el bucle.
func restart() -> void:
	# La salida es la línea de meta. En sentido inverso, mirando al otro lado:
	# el circuito es el mismo, se recorre al revés.
	vehicle.position = track_builder.start_position
	vehicle.reset_to_start(track_builder.start_yaw + (PI if GameSettings.reverse else 0.0))
	lap_timer.set_reversed(GameSettings.reverse)
	VehicleInput.release()
	begin_countdown()
	restarted.emit()


func _on_settings_changed() -> void:
	rebuild_track()
	restart()


func _on_sector_completed(sector: int, split_ms: int) -> void:
	var reference := RaceRecords.best_splits(record_key())
	if sector >= reference.size():
		sector_delta.emit(sector, 0, false)
		return

	sector_delta.emit(sector, split_ms - int(reference[sector]), true)


func _on_lap_completed(duration_ms: int, splits_ms: Array) -> void:
	if RaceRecords.submit(record_key(), duration_ms, splits_ms):
		record_beaten.emit(duration_ms)
