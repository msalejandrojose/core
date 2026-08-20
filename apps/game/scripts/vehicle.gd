class_name Vehicle extends Node3D

# Nodes

@onready var sphere: RigidBody3D = $Sphere
@onready var raycast: RayCast3D = $Ground

# Vehicle elements

@onready var vehicle_model = $Container
@onready var vehicle_body = get_node_or_null("Container/Model/body")

# (Optional) wheels

@onready var wheel_fl = get_node_or_null("Container/Model/wheel-front-left")
@onready var wheel_fr = get_node_or_null("Container/Model/wheel-front-right")
@onready var wheel_bl = get_node_or_null("Container/Model/wheel-back-left")
@onready var wheel_br = get_node_or_null("Container/Model/wheel-back-right")

# Effects

@onready var trail_left = get_node_or_null("Container/TrailLeft")
@onready var trail_right = get_node_or_null("Container/TrailRight")

## Las dos estelas comparten un único `ParticleProcessMaterial` en la escena
## (mismo terreno bajo todo el coche, así que tiene sentido). Se duplica al
## arrancar para poder cambiarle el color en vivo sin mutar el recurso
## original — si no, el cambio se quedaría pegado entre partidas o entre
## arneses de test que cargan la escena varias veces en el mismo proceso.
@onready var _trail_material: ParticleProcessMaterial = _init_trail_material()

# Sounds

@onready var screech_sound: AudioStreamPlayer3D = $Container/ScreechSound
@onready var engine_sound: AudioStreamPlayer3D = $Container/EngineSound
@onready var impact_sound: AudioStreamPlayer3D = $Container/ImpactSound

# Posición de salida, capturada antes del primer frame. Se usa @onready y no
# _ready porque la moto sobreescribe _ready sin llamar a super().

@onready var _start_sphere_position: Vector3 = sphere.position
@onready var _start_model_transform: Transform3D = vehicle_model.transform

var input: Vector3
var normal: Vector3

var acceleration: float
var angular_speed: float
var linear_speed: float

var colliding: bool

var linear_velocity: Vector3
var prev_position: Vector3

var calculated_lean: float

## Agarre EFECTIVO ahora mismo: lo usa la física cada frame. Se recalcula solo
## en `_update_terrain`, cruzando `base_grip` con el terreno de sección bajo
## el coche — nadie más debería escribir en este campo. Con poco agarre todo
## llega tarde (girar, acelerar, frenar), que es la sensación de ir sobre
## nieve o hielo.
var grip: float = 1.0

## Velocidad punta EFECTIVA ahora mismo: igual que `grip`, recalculada cada
## frame (el barro la frena; el hielo no).
var speed_scale: float = 1.0

## Agarre del coche (arquetipo + piezas) × agarre del TEMA del circuito
## entero. Lo pone el director al construir o reequipar — es la base sobre la
## que `_update_terrain` monta el efecto del terreno de sección, que sí
## cambia solo con la posición y no necesita que el director haga nada.
var base_grip: float = 1.0

## Velocidad del coche (arquetipo + piezas) × cilindrada. Misma idea que
## `base_grip` para el otro eje.
var base_speed_scale: float = 1.0

## Si el TEMA del circuito entero ya cuenta como fuera de asfalto (nieve). El
## terreno de sección puede activar lo mismo aunque el tema sea asfalto seco
## (TASK-264/270): los dos casos convergen en el mismo `offroad_grip_modifier`.
var theme_is_offroad: bool = false

## Cuánto multiplica el arquetipo el agarre cuando la superficie no es
## asfalto seco, por tema o por terreno de sección.
var offroad_grip_modifier: float = 1.0

## De aquí se lee qué terreno hay bajo cada celda. Lo pone el director una vez
## (no cambia con el circuito: es el mismo nodo durante toda la partida).
var track_builder: TrackBuilder

## Cuánto se acerca cada segundo el efecto de terreno "en vivo" a su valor
## objetivo. Alto a propósito: una mancha de terreno puede ser de solo un par
## de celdas, y si tarda mucho en notarse el coche ya la habrá cruzado sin
## sentir nada — pero seguir siendo un lerp (no un salto) es lo que evita el
## tirón de manejo al cruzar el borde.
const TERRAIN_BLEND_RATE := 6.0

var _terrain_grip_factor: float = 1.0
var _terrain_speed_factor: float = 1.0

## Color de las estelas por terreno (TASK-274): que el hielo derrape distinto
## a simple vista, no solo que agarre distinto por dentro. El asfalto es el
## gris humo que ya traía la escena — se lee de ahí, no se hardcodea aquí, así
## que cambiarlo en el editor no desincroniza este mapa.
var _terrain_trail_colors: Dictionary

# --- Nitro --------------------------------------------------------------------
#
# El depósito es lo que convierte el nitro en una decisión. Sin él, pulsarlo
# siempre sería la jugada correcta y dejaría de ser una jugada.

## Cuánto empuja por encima del máximo normal mientras está activo.
const NITRO_BOOST := 1.5
## Segundos de nitro continuo que da el depósito lleno.
const NITRO_DURATION_S := 2.0
## Segundos en recargarlo entero desde vacío. Más largo que el gasto: la gracia
## está en elegir DÓNDE se usa, no en tenerlo siempre disponible.
const NITRO_RECHARGE_S := 8.0
## Por debajo de esto no arranca. Evita el tartamudeo de dar empujoncitos con
## los restos del depósito.
const NITRO_MIN_CHARGE := 0.15

## Depósito, de 0 a 1. Lo lee el HUD para dibujar la carga en el propio botón.
var nitro_charge: float = 1.0
## Si el nitro está empujando AHORA. No es lo mismo que pulsarlo: sin depósito
## se pulsa igual y no pasa nada.
var nitro_active: bool = false

# Public Functions

## `self` (el `Vehicle` de fuera) se queda fijo donde lo dejó `reset_to_start`
## — quien de verdad se mueve conduciendo es `vehicle_model`, siguiendo a
## `sphere` cada físico (línea 266). Cualquier código que quiera "dónde está
## el coche ahora mismo" tiene que pasar por aquí, nunca por
## `vehicle.global_position` directamente.
func get_vehicle_position() -> Vector3: return vehicle_model.global_position

## Mismo motivo que `get_vehicle_position`: el giro real está en
## `vehicle_model.rotate_y()` (línea 225), no en `self.rotation`.
func get_vehicle_yaw() -> float: return vehicle_model.rotation.y

## Duplica el material compartido de las estelas y arma el mapa de colores por
## terreno a partir de su color original (asfalto), para no repetir ese
## número mágico en dos sitios. Vive en `@onready` y no en `_ready` por lo
## mismo que `_start_sphere_position`: la moto sobreescribe `_ready` sin
## llamar a `super()`, y esto tiene que correr igual para las dos.
func _init_trail_material() -> ParticleProcessMaterial:
	if trail_left == null:
		return null

	var material: ParticleProcessMaterial = trail_left.process_material.duplicate()
	trail_left.process_material = material
	if trail_right != null:
		trail_right.process_material = material

	_terrain_trail_colors = {
		TrackTerrain.Kind.ASPHALT: material.color,
		TrackTerrain.Kind.ICE: Color(0.85, 0.93, 1.0, material.color.a),
		TrackTerrain.Kind.MUD: Color(0.35, 0.24, 0.12, material.color.a),
		TrackTerrain.Kind.WATER: Color(0.55, 0.75, 0.9, material.color.a),
	}

	return material

## Cambia el modelo 3D montado en el contenedor sin tocar la física ni la
## posición: la esfera y `Container` no se enteran, solo cambia lo que se ve.
## Los camiones de cada arquetipo comparten la misma jerarquía de nodos
## (body, wheel-*), así que basta con reinstanciar "Model" y volver a
## resolver las referencias — a diferencia de la moto, que sí tiene una forma
## distinta de verdad y por eso es una escena (y un script) aparte.
## Desplazamiento lateral y duración de la entrada cuando `animate` pide que
## el modelo nuevo llegue conduciendo — mismos números que
## `VehiclePreview.show_archetype()`, que hacía este mismo efecto para el
## visor en miniatura que el taller ya no usa (ahora el coche que cambia es
## este, el del garaje de fondo, ver `race_director.preview_archetype_body`).
const _BODY_ENTRY_OFFSET_X := 5.0
const _BODY_ENTRY_DURATION_S := 0.55

func set_body(scene: PackedScene, animate: bool = false) -> void:
	var old_model := vehicle_model.get_node_or_null("Model")
	if old_model != null:
		vehicle_model.remove_child(old_model)
		old_model.queue_free()

	var new_model: Node = scene.instantiate()
	new_model.name = "Model"
	vehicle_model.add_child(new_model)

	vehicle_body = vehicle_model.get_node_or_null("Model/body")
	wheel_fl = vehicle_model.get_node_or_null("Model/wheel-front-left")
	wheel_fr = vehicle_model.get_node_or_null("Model/wheel-front-right")
	wheel_bl = vehicle_model.get_node_or_null("Model/wheel-back-left")
	wheel_br = vehicle_model.get_node_or_null("Model/wheel-back-right")

	if animate and new_model is Node3D:
		new_model.position.x = _BODY_ENTRY_OFFSET_X
		var tween := create_tween()
		tween.set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
		tween.tween_property(new_model, "position:x", 0.0, _BODY_ENTRY_DURATION_S)

## Devuelve el coche a la salida sin recargar la escena. Hay que limpiar la
## velocidad de la esfera y el estado derivado: si solo se recoloca, el coche
## reaparece con la inercia del intento anterior y el crono nuevo empieza con
## el coche ya lanzado.

func reset_to_start(yaw: float = 0.0) -> void:

	sphere.position = _start_sphere_position
	sphere.linear_velocity = Vector3.ZERO
	sphere.angular_velocity = Vector3.ZERO

	vehicle_model.transform = _start_model_transform
	if yaw != 0.0:
		vehicle_model.rotate_y(yaw)

	input = Vector3.ZERO
	nitro_charge = 1.0
	nitro_active = false
	linear_speed = 0.0
	angular_speed = 0.0
	acceleration = 0.0
	calculated_lean = 0.0
	linear_velocity = Vector3.ZERO
	prev_position = vehicle_model.position
	colliding = false

	# No tiene sentido que un reinicio herede el derrape a medio converger de
	# la celda de terreno donde se cayó el intento anterior; `_update_terrain`
	# recalcula `grip`/`speed_scale` de verdad en el siguiente frame de física.
	_terrain_grip_factor = 1.0
	_terrain_speed_factor = 1.0

# Functions

func _physics_process(delta):

	handle_input(delta)

	var direction = sign(linear_speed)
	if direction == 0: direction = sign(input.z) if abs(input.z) > 0.1 else 1

	var steering_grip = clamp(abs(linear_speed), 0.2, 1.0)

	var target_angular = -input.x * steering_grip * 4 * direction
	angular_speed = lerp(angular_speed, target_angular, delta * 4 * grip)

	vehicle_model.rotate_y(angular_speed * delta)

	# Ground alignment

	if raycast.is_colliding():
		if !colliding:
			if vehicle_body != null: vehicle_body.position = Vector3(0, 0.1, 0) # Bounce
			input.z = 0

		normal = raycast.get_collision_normal()

		# Orient model to colliding normal

		if normal.dot(vehicle_model.global_basis.y) > 0.5:
			var xform = align_with_y(vehicle_model.global_transform, normal)
			vehicle_model.global_transform = vehicle_model.global_transform.interpolate_with(xform, 0.2).orthonormalized()

	colliding = raycast.is_colliding()

	_update_terrain(delta)

	update_nitro(delta)

	# El nitro solo empuja hacia delante: no sirve para frenar antes ni para dar
	# marcha atrás a lo loco.
	var target_speed = input.z * speed_scale
	if nitro_active and target_speed > 0.0:
		target_speed *= NITRO_BOOST

	if (target_speed < 0 and linear_speed > 0.01):
		linear_speed = lerp(linear_speed, 0.0, delta * 8 * grip)
	else:
		if (target_speed < 0):
			linear_speed = lerp(linear_speed, target_speed / 2, delta * 2 * grip)
		else:
			linear_speed = lerp(linear_speed, target_speed, delta * 6 * grip)

	acceleration = lerpf(acceleration, linear_speed + (abs(sphere.angular_velocity.length() * linear_speed) / 100), delta * 1)

	# Match vehicle model to physics sphere

	vehicle_model.position = sphere.position - Vector3(0, 0.65, 0)
	raycast.position = sphere.position

	# Calculate vehicle model linear velocity

	linear_velocity = (vehicle_model.position - prev_position) / delta
	prev_position = vehicle_model.position

	# Visual and audio effects

	effect_engine(delta)
	effect_body(delta)
	effect_wheels(delta)
	effect_trails()

## Cruza el terreno de sección bajo el coche (TASK-271/273) con el agarre del
## coche/tema y el modificador offroad del arquetipo (TASK-264), y los
## acerca (no salta) a `grip`/`speed_scale`. Mismo sitio único para la fórmula
## tanto si el circuito entero es offroad (tema nieve) como si es solo esta
## celda: los dos casos convergen en el mismo `offroad_grip_modifier`, así que
## no hay que aplicarlo dos veces si coinciden.
func _update_terrain(delta: float) -> void:

	var terrain := TrackTerrain.Kind.ASPHALT
	if track_builder != null and raycast.is_colliding():
		terrain = track_builder.terrain_at(raycast.get_collision_point())

	var effect := TerrainCatalog.effect(terrain)
	var is_offroad := theme_is_offroad or terrain != TrackTerrain.Kind.ASPHALT
	var offroad_factor := offroad_grip_modifier if is_offroad else 1.0

	var target_grip_factor := effect.grip * offroad_factor
	var target_speed_factor := effect.grip if effect.slows_top_speed else 1.0

	var blend := clampf(delta * TERRAIN_BLEND_RATE, 0.0, 1.0)
	_terrain_grip_factor = lerp(_terrain_grip_factor, target_grip_factor, blend)
	_terrain_speed_factor = lerp(_terrain_speed_factor, target_speed_factor, blend)

	grip = base_grip * _terrain_grip_factor
	speed_scale = base_speed_scale * _terrain_speed_factor

	# Sin lerp a propósito: cada partícula ya nacida conserva su color, así
	# que el cambio se ve como una estela que va mudando de color con las
	# partículas nuevas, no como un tirón — no hace falta interpolar nada más.
	if _trail_material != null:
		_trail_material.color = _terrain_trail_colors.get(
			terrain, _terrain_trail_colors[TrackTerrain.Kind.ASPHALT])

## Gasta o recarga el depósito. Se pide desde el input y se concede aquí: el
## coche es quien sabe si queda.

func update_nitro(delta):

	var wants = VehicleInput.nitro and input.z > 0.0

	if wants and (nitro_active or nitro_charge >= NITRO_MIN_CHARGE) and nitro_charge > 0.0:
		nitro_active = true
		nitro_charge = maxf(nitro_charge - delta / NITRO_DURATION_S, 0.0)
	else:
		nitro_active = false
		nitro_charge = minf(nitro_charge + delta / NITRO_RECHARGE_S, 1.0)

# Handle input when vehicle is colliding with ground

func handle_input(delta):

	# El input viene del autoload, no del teclado: la misma física sirve para
	# táctil, teclado y (más adelante) reproducir un ghost.

	if raycast.is_colliding():
		input.x = VehicleInput.steer
		input.z = VehicleInput.throttle

	sphere.angular_velocity += vehicle_model.get_global_transform().basis.x * (linear_speed * 100) * delta

func effect_body(delta):
	
	calculated_lean = lerp_angle(calculated_lean, -input.x / 5 * linear_speed, delta * 5)
	
	# Slightly tilt (and move) body based on acceleration and steering
	
	if vehicle_body != null:
		
		vehicle_body.rotation.x = lerp_angle(vehicle_body.rotation.x, -(linear_speed - acceleration) / 6, delta * 10)
		vehicle_body.rotation.z = calculated_lean
		
		vehicle_body.position = vehicle_body.position.lerp(Vector3(0, 0.2, 0), delta * 5)
	
func effect_wheels(delta):

	# Rotate wheels based on acceleration

	for wheel in [wheel_fl, wheel_fr, wheel_bl, wheel_br]:
		if wheel != null:
			wheel.rotation.x += acceleration

	# Rotate front wheels based on steering direction

	if wheel_fl != null: wheel_fl.rotation.y = lerp_angle(wheel_fl.rotation.y, -input.x / 1.5, delta * 10)
	if wheel_fr != null: wheel_fr.rotation.y = lerp_angle(wheel_fr.rotation.y, -input.x / 1.5, delta * 10)

# Engine sounds

func effect_engine(delta):

	var speed_factor = clamp(abs(linear_speed), 0.0, 1.0)
	var throttle_factor = clamp(abs(input.z), 0.0, 1.0)

	var target_volume = remap(speed_factor + (throttle_factor * 0.5), 0.0, 1.5, -15.0, -5.0)
	engine_sound.volume_db = lerp(engine_sound.volume_db, target_volume, delta * 5.0)

	var target_pitch = remap(speed_factor, 0.0, 1.0, 0.5, 3)
	if throttle_factor > 0.1: target_pitch += 0.2

	engine_sound.pitch_scale = lerp(engine_sound.pitch_scale, target_pitch, delta * 2.0)

# Show trails (and play skid sound)

func effect_trails():

	var drift_intensity = abs(linear_speed - acceleration) + (abs(calculated_lean) * 2.0)
	# Con nitro las estelas salen siempre, se derrape o no: es la señal de que
	# el coche está empujando, no de que esté patinando.
	var should_emit = drift_intensity > 0.25 or nitro_active

	if trail_left != null: trail_left.emitting = should_emit
	if trail_right != null: trail_right.emitting = should_emit

	var target_volume = -80.0
	if should_emit: target_volume = remap(clamp(drift_intensity, 0.25, 2.0), 0.25, 2.0, -10.0, 0.0)

	screech_sound.pitch_scale = lerp(screech_sound.pitch_scale, clamp(abs(linear_speed), 1.0, 3.0), 0.1)
	screech_sound.volume_db = lerp(screech_sound.volume_db, target_volume, 10.0 * get_physics_process_delta_time())

# Align vehicle with normal

func align_with_y(xform, new_y):

	xform.basis.y = new_y
	xform.basis.x = -xform.basis.z.cross(new_y)
	xform.basis = xform.basis.orthonormalized()
	return xform

# Detect collisions and play impact sound

func _on_sphere_body_entered(_body: Node) -> void:
	
	if vehicle_body == null: return
	
	if not impact_sound.playing:
		var impact_velocity := absf(linear_velocity.dot(vehicle_body.global_basis.z))
		impact_sound.volume_db = clampf(remap(impact_velocity, 0.0, 6.0, -20.0, 0.0), -20.0, 0.0)
		impact_sound.play()
