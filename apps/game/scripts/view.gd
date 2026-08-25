extends Node3D

@export_group("Properties")
@export var target: Vehicle

@onready var camera = $Camera

## Ángulo de cámara en reposo. Se guarda del propio nodo para no duplicar aquí
## el valor que esté puesto en la escena.
@onready var BASE_FOV: float = camera.fov

## Cuánto se abre el ángulo y se aleja la cámara con el nitro.
const NITRO_FOV_KICK := 12.0
const NITRO_PULL_BACK := 2.5

## Distancia de cámara con el garaje de fondo (menú y taller). En carrera el
## encuadre tiene que dar margen para ver venir el circuito, pero en el menú
## el sujeto es el coche aparcado y a la distancia de carrera se queda
## pequeño. La alternativa —agrandar el coche— no vale: el del garaje ES el
## `Vehicle` que corre, así que escalarlo tocaría las carreras.
const MENU_DISTANCE := 7.0

## El hueco libre del menú no está centrado en pantalla: las tarjetas comen
## ~330px por la izquierda y ~565px por la derecha, así que el centro óptico
## cae bastante a la izquierda del centro real. Y como en isométrica lo que
## está detrás (el arco de meta) se proyecta hacia arriba y a la DERECHA, sin
## corregir esto su pie derecho acaba debajo de la tarjeta de configuración.
## Desplazar la cámara a +X mueve la escena a la izquierda en pantalla.
const MENU_OFFSET_X := 0.8

## Lo pone `RaceDirector` a la vez que la visibilidad del garaje.
var menu_framing := false

# Functions

## Salta a donde esté el coche, sin suavizado. Al reiniciar o al cambiar de
## circuito el coche aparece en la meta de golpe; una cámara que llega
## suavizando desde el punto anterior hace parecer que la salida está en otro
## sitio, o directamente enseña un trozo de mundo vacío.

func snap():

	self.position = target.get_vehicle_position()

func _physics_process(delta):
	
	# Ease position towards target vehicle position
	
	self.position = self.position.lerp(target.get_vehicle_position(), delta * 4)

	# Zoom camera based on the speed of the vehicle

	var speed_factor = clamp(abs(target.linear_speed), 0.0, 1.0)
	var target_z = remap(speed_factor, 0.0, 1.0, 10, 20)

	# Con nitro la cámara se echa atrás y abre el ángulo. Es el truco de toda la
	# vida para que la velocidad se SIENTA: el coche no va mucho más rápido en
	# pantalla, pero entra más mundo por los lados y todo pasa más deprisa.
	# Entra rápido y sale despacio, que es como se lee un empujón.

	var boosting = target.nitro_active
	if boosting: target_z += NITRO_PULL_BACK

	# En el menú se va a la distancia fija, y deprisa: el 0.5 de carrera es un
	# acercamiento de varios segundos, y al abrir el menú la cámara se queda a
	# medio camino con el coche todavía pequeño.
	var approach := 3.0 if boosting else 0.5
	if menu_framing:
		target_z = MENU_DISTANCE
		approach = 3.0

	camera.position.z = lerp(camera.position.z, target_z, delta * approach)
	camera.position.x = lerp(
		camera.position.x, MENU_OFFSET_X if menu_framing else 0.0, delta * 3.0
	)

	var target_fov = BASE_FOV + (NITRO_FOV_KICK if boosting else 0.0)
	camera.fov = lerp(camera.fov, target_fov, delta * (6.0 if boosting else 2.5))
