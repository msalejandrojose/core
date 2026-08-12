extends Node

## Fuente única de input del vehículo.
##
## El coche NO lee teclado ni pantalla directamente: lee de aquí. Así el mismo
## `vehicle.gd` sirve en editor (teclado), en móvil (táctil) y más adelante para
## reproducir un ghost o un replay, que no son más que otra fuente de input.
##
## Autoload registrado como `VehicleInput` en project.godot.

## Dirección: -1 (todo a la izquierda) .. +1 (todo a la derecha).
var steer: float = 0.0

## Acelerador: +1 acelera, -1 frena/marcha atrás, 0 punto muerto.
var throttle: float = 0.0

## Lo pone a true la capa táctil mientras haya un dedo en pantalla. Cuando es
## true el teclado se ignora, para que un dedo apoyado no pelee con una tecla.
var touch_active: bool = false

## Bloquea el coche del todo. Lo usa el semáforo: durante la cuenta atrás se
## puede tocar la pantalla, pero el coche no se mueve. Se comprueba aquí y en
## `touch_controls.gd`, porque ambos escriben en `steer`/`throttle`.
var locked: bool = false


func _process(_delta: float) -> void:
	if locked:
		steer = 0.0
		throttle = 0.0
		return

	if touch_active:
		return

	steer = Input.get_axis("left", "right")
	throttle = Input.get_axis("back", "forward")


## Suelta todo. Lo llama el reinicio de vuelta para que el coche no arranque
## con el acelerador heredado del intento anterior.
func release() -> void:
	steer = 0.0
	throttle = 0.0
	touch_active = false
