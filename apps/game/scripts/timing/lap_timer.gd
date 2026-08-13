class_name LapTimer extends Node

## Cronómetro de vuelta con validación por checkpoints.
##
## Todo en milisegundos ENTEROS. Nunca floats: un tiempo es un dato que se
## compara, se ordena y se sube a un leaderboard, y los floats hacen que dos
## vueltas idénticas dejen de serlo.
##
## Una vuelta solo cuenta si se cruzan todos los checkpoints en orden. Cruzar
## la meta sin haberlos pasado no completa nada — ese es el antiatajo.

signal lap_started()
## `sector` es la POSICIÓN dentro de la vuelta, no el id del checkpoint: en
## sentido inverso se cruzan los checkpoints 2,1,0 pero los sectores siguen
## siendo 0,1,2, y es contra el sector contra lo que se comparan los splits.
signal sector_completed(sector: int, split_ms: int)
signal lap_completed(duration_ms: int, splits_ms: Array)
## Se ha cruzado algo fuera de orden. `got` es -1 cuando lo cruzado es la meta.
signal shortcut_rejected(expected: int, got: int)

## Checkpoints intermedios, sin contar la meta. Lo rellena `_ready` a partir de
## los que encuentre en la escena; el valor de aquí es solo el de por defecto.
@export var checkpoint_count: int = 3

## Arrancar el crono con el primer acelerón. Salida parada, como en Trackmania.
## Los tests lo desactivan para controlar el instante de inicio.
@export var auto_start_on_throttle: bool = true

var running: bool = false
var elapsed_ms: int = 0

## Reloj inyectable para poder testear sin esperar en tiempo real.
var clock: Callable = Callable(Time, "get_ticks_msec")

## Orden en el que hay que cruzar los checkpoints. En sentido inverso es el
## mismo recorrido leído al revés, no unos checkpoints distintos.
var checkpoint_order: Array[int] = []

var _start_ms: int = 0
var _splits: Array[int] = []
var _next_checkpoint: int = 0


func _ready() -> void:
	rescan()


## Vuelve a engancharse a los checkpoints que haya ahora en la escena. Hay que
## llamarlo cada vez que se construye un circuito: las puertas son nodos nuevos,
## y las del circuito anterior ya no existen.
func rescan() -> void:
	var found := get_tree().get_nodes_in_group("checkpoint")
	var intermediate := 0
	for node in found:
		if node.has_signal("crossed"):
			if not node.crossed.is_connected(_on_checkpoint_crossed):
				node.crossed.connect(_on_checkpoint_crossed)
			if not node.is_finish:
				intermediate += 1

	if not found.is_empty():
		checkpoint_count = intermediate

	set_reversed(false)


## Recalcula el recorrido esperado. Aborta la vuelta en curso: cambiar de
## sentido a mitad de vuelta dejaría un tiempo que no es de ningún circuito.
func set_reversed(reversed: bool) -> void:
	checkpoint_order.clear()
	for i in checkpoint_count:
		checkpoint_order.append(checkpoint_count - 1 - i if reversed else i)
	abort()


func _process(_delta: float) -> void:
	if running:
		elapsed_ms = clock.call() - _start_ms
	elif auto_start_on_throttle and absf(VehicleInput.throttle) > 0.1:
		start()


# --- API ----------------------------------------------------------------------

func start() -> void:
	_begin_at(clock.call())


## Descarta la vuelta en curso y deja el crono parado. Lo usa el reinicio
## rápido, que además recoloca el coche.
func abort() -> void:
	running = false
	elapsed_ms = 0
	_splits.clear()
	_next_checkpoint = 0


## Devuelve true si el cruce ha contado.
func cross_checkpoint(index: int) -> bool:
	if not running:
		return false

	var expected := checkpoint_order[_next_checkpoint] if _next_checkpoint < checkpoint_order.size() else -1
	if index != expected:
		shortcut_rejected.emit(expected, index)
		return false

	var split: int = clock.call() - _start_ms
	_splits.append(split)
	_next_checkpoint += 1
	sector_completed.emit(_next_checkpoint - 1, split)
	return true


## Devuelve true si la vuelta se ha completado. Al completarse encadena la
## siguiente en el mismo instante exacto del cruce, para que dar vueltas
## seguidas no pierda milisegundos entre una y otra.
func cross_finish() -> bool:
	if not running:
		return false

	if _next_checkpoint < checkpoint_count:
		shortcut_rejected.emit(_next_checkpoint, -1)
		return false

	var crossed_at: int = clock.call()
	var duration: int = crossed_at - _start_ms
	_splits.append(duration)
	var splits := _splits.duplicate()

	_begin_at(crossed_at)
	lap_completed.emit(duration, splits)
	return true


## Sectores que tendrá el array de splits: los checkpoints más la meta. Es el
## `checkpointCount` que espera la API — allí el último split es la duración.
func sector_count() -> int:
	return checkpoint_count + 1


## Cuántos checkpoints faltan para poder validar la vuelta.
func remaining_checkpoints() -> int:
	return maxi(checkpoint_count - _next_checkpoint, 0)


# --- Interno ------------------------------------------------------------------

func _begin_at(ms: int) -> void:
	_start_ms = ms
	_splits.clear()
	_next_checkpoint = 0
	elapsed_ms = 0
	running = true
	lap_started.emit()


func _on_checkpoint_crossed(checkpoint) -> void:
	if checkpoint.is_finish:
		cross_finish()
	else:
		cross_checkpoint(checkpoint.index)
