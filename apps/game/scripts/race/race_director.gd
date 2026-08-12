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

@export var track_id: String = "kenney-01"
@export var vehicle_path: NodePath = ^"../Vehicle"
@export var lap_timer_path: NodePath = ^"../LapTimer"

var vehicle: Vehicle
var lap_timer: LapTimer

var counting_down: bool = false
var _countdown_elapsed: float = 0.0
var _lights_on: int = 0


func _ready() -> void:
	vehicle = get_node(vehicle_path)
	lap_timer = get_node(lap_timer_path)

	lap_timer.sector_completed.connect(_on_sector_completed)
	lap_timer.lap_completed.connect(_on_lap_completed)

	# Con semáforo, arrancar el crono es decisión del director. Dejar además el
	# arranque por acelerón haría que el crono empezara antes que la carrera.
	lap_timer.auto_start_on_throttle = false

	begin_countdown()


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


## Reinicio rápido. No recarga la escena: recoloca el coche y reinicia el
## estado. Es el gesto más usado de un contrarreloj, así que tiene que ser
## instantáneo — una pantalla de carga aquí mataría el bucle de juego.
func restart() -> void:
	vehicle.reset_to_start()
	VehicleInput.release()
	begin_countdown()
	restarted.emit()


func _on_sector_completed(checkpoint: int, split_ms: int) -> void:
	var reference := RaceRecords.best_splits(track_id)
	if checkpoint >= reference.size():
		sector_delta.emit(checkpoint, 0, false)
		return

	sector_delta.emit(checkpoint, split_ms - int(reference[checkpoint]), true)


func _on_lap_completed(duration_ms: int, splits_ms: Array) -> void:
	if RaceRecords.submit(track_id, duration_ms, splits_ms):
		record_beaten.emit(duration_ms)
