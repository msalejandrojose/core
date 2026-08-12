class_name RaceDirector extends Node

## Pega el cronómetro, el coche y las marcas guardadas. El HUD solo escucha.

signal restarted()
signal record_beaten(duration_ms: int)
## `has_reference` es false mientras no haya récord contra el que comparar:
## el HUD debe mostrar el sector sin delta en vez de un "+0.000" mentiroso.
signal sector_delta(checkpoint: int, delta_ms: int, has_reference: bool)

@export var track_id: String = "kenney-01"
@export var vehicle_path: NodePath = ^"../Vehicle"
@export var lap_timer_path: NodePath = ^"../LapTimer"

var vehicle: Vehicle
var lap_timer: LapTimer


func _ready() -> void:
	vehicle = get_node(vehicle_path)
	lap_timer = get_node(lap_timer_path)

	lap_timer.sector_completed.connect(_on_sector_completed)
	lap_timer.lap_completed.connect(_on_lap_completed)


func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_R:
		restart()
		get_viewport().set_input_as_handled()


## Reinicio rápido. No recarga la escena: recoloca el coche y reinicia el
## estado. Es el gesto más usado de un contrarreloj, así que tiene que ser
## instantáneo — una pantalla de carga aquí mataría el bucle de juego.
func restart() -> void:
	vehicle.reset_to_start()
	lap_timer.abort()
	VehicleInput.release()
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
