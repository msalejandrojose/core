extends Node3D

## Fondo de garaje detrás del menú principal y del taller.
## Se construye pieza a pieza en código — sin assets externos salvo los
## modelos GLB ya presentes en `models/`. El coche equipado (origen) lo
## gestiona `RaceDirector`, no este nodo.
##
## OJO con los ejes: este nodo cuelga de `View`, que es el rig de cámara
## isométrico — su transform en `main.tscn` lleva 45° de giro y ~35° de
## inclinación, y `view.gd` solo le sincroniza `position` con el coche, nunca
## la rotación. O sea que todo lo que se añada aquí hereda la orientación de
## la CÁMARA, no la del mundo. Un suelo "horizontal" ingenuo sale inclinado
## 35° encarando al objetivo y se lee como una calcomanía plana, no como
## suelo — que es justo lo que pasaba antes.
##
## Por eso hay dos formas de colocar piezas:
##   - `_add_box()`  — alineada al MUNDO (y por tanto al coche, que está sin
##     rotar). Para suelo, props, cualquier cosa que se apoye.
##   - `_add_backdrop()` — hereda la orientación de cámara a propósito, para
##     el telón de fondo que tiene que tapar todo el encuadre.


## Altura de los raíles elevadores. Las ruedas del coche apoyan justo en y=0 y
## el coche lo coloca `RaceDirector` (es el mismo `Vehicle` que corre), así que
## no se puede subir sin tocar las carreras. Se hace al revés: los raíles van
## de -RAIL_HEIGHT a 0 y el suelo se hunde esa misma altura, con lo que el
## coche queda elevado sobre los hierros sin moverlo ni un milímetro.
const RAIL_HEIGHT := 0.18

## Separación de las ruedas (x=±0.275 en el AABB del modelo) y recorrido que
## cubren de morro a cola (z de -0.48 a 0.58 contando el radio).
const WHEEL_TRACK := 0.275
const RAIL_WIDTH := 0.30
const RAIL_LENGTH := 1.7
const RAMP_LENGTH := 0.45

const STEEL := Color("6e7480")
const TOOLBOX_RED := Color("bf4a3c")
const TOOLBOX_DRAWER := Color("a33c30")
const CHROME := Color("cfd3d8")
const RUBBER := Color("2b2b2f")


func _ready() -> void:
	_add_backdrop(Vector3(0, 2, -7), Vector2(30, 24), Color("d6d3ce"))

	# Suelo, hundido para dejar sitio a los raíles. Largo de sobra por detrás
	# para que el asfalto del arco (ver abajo) quede tapado entero.
	# El ancho va atado al arco y al coche aparcado: si el suelo se queda
	# corto, los pies del pórtico y las ruedas del segundo coche flotan en el
	# aire. El largo, en cambio, es el de siempre.
	_add_box(Vector3(0, -RAIL_HEIGHT - 0.06, 0), Vector3(7.2, 0.12, 7.0), Color("6b5040"))

	# Los dos hierros de elevar, uno bajo cada línea de ruedas, con su rampita
	# de subida en el extremo delantero (+Z, el que queda hacia el
	# espectador): el coche "entra" por ahí.
	for side in [1.0, -1.0]:
		_add_box(
			Vector3(side * WHEEL_TRACK, -RAIL_HEIGHT * 0.5, 0.05),
			Vector3(RAIL_WIDTH, RAIL_HEIGHT, RAIL_LENGTH),
			STEEL,
		)
		_add_ramp(side * WHEEL_TRACK, 0.05 + RAIL_LENGTH * 0.5)

	# Arco de meta detrás del coche (-Z es la cola: las delanteras están en
	# +Z y las partículas de derrape en -Z). El GLB es la baldosa ENTERA de
	# circuito —14 x 7 x 10, unas 15 veces el ancho del coche— y es UNA SOLA
	# malla, así que no hay forma de quedarse solo con el pórtico: viene con
	# su asfalto y sus vallas laterales. Se escala el conjunto y se hunde
	# bajo el suelo del garaje, que hace de recorte: lo bajo (asfalto,
	# vallas, que sueltas parecen palos tirados) desaparece y solo asoma el
	# arco.
	# A 0.42 mide 5.9 de ancho: de ahí el suelo de arriba. El hundido también
	# escala — es lo que tapa asfalto y vallas.
	_add_model("res://models/track-finish.glb", Vector3(0, -RAIL_HEIGHT - 0.58, -2.0), 0.42)

	# Armario de herramientas a la izquierda del coche.
	_add_toolbox(-1.55, 0.15)

	# Segundo coche aparcado, A LA IZQUIERDA del armario y mirándolo.
	#
	# "Izquierda en pantalla" NO es -X a secas: con esta cámara -X se proyecta
	# hacia la izquierda pero también hacia ARRIBA, así que un coche movido
	# solo en -X sale por encima del armario, como si estuviera detrás. La
	# izquierda de verdad es la diagonal (-X, +Z) —el eje X local de `View`
	# apunta a (0.707, 0, -0.707), o sea que su opuesto normalizado reparte a
	# partes iguales entre -X y +Z—, de ahí que se desplace en las dos.
	#
	# Y el armario tiene que quedarle A SU IZQUIERDA —como si fueras al
	# volante y giraras la cabeza—, no de frente. Sentado mirando al morro
	# (+Z propio) con +Y arriba, la derecha del coche es forward × up =
	# (0,0,1) × (0,1,0) = (-1,0,0), o sea -X; luego SU IZQUIERDA es su +X.
	# Desde aquí el armario cae en la dirección (0.707, 0, -0.707), así que
	# hay que llevar el +X local ahí: con 45° de giro en Y el +X pasa a
	# (cos45, 0, -sen45), justo esa. (Apuntar el morro daría 135°, que es
	# mirarlo de frente.)
	#
	# Modelo morado a propósito: es el único de `models/` que no está mapeado
	# a ningún arquetipo (amarillo = normal, rojo = f1, verde = 4x4), así que
	# no da a entender que sea un coche seleccionable.
	_add_model(
		"res://models/vehicle-truck-purple.glb",
		Vector3(-2.75, -RAIL_HEIGHT, 1.35),
		1.0,
		45.0,
	)


## Caja alineada con los ejes del mundo. `offset` es world-space respecto al
## coche (que vive en el origen local de `View`).
func _add_box(offset: Vector3, size: Vector3, color: Color) -> MeshInstance3D:
	var box := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = size
	box.mesh = mesh
	var world := _world_basis()
	box.basis = world
	box.position = world * offset
	box.material_override = _flat_material(color)
	add_child(box)
	return box


## Armario de herramientas rodante de los de taller grande: ruedas, cuerpo de
## cajones, encimera y cofre superior.
##
## Va A LA IZQUIERDA del coche, que en coordenadas de mundo es -X: el eje X
## local de `View` apunta a (0.707, 0, -0.707), así que +X se proyecta hacia
## la derecha de la pantalla y -X hacia la izquierda. Y puesto de lado, o sea
## con el largo en Z y el frente de cajones mirando a +X, hacia el coche.
func _add_toolbox(x: float, z: float) -> void:
	var ground := -RAIL_HEIGHT
	var caster := 0.09
	var body_height := 0.70
	var chest_height := 0.32
	var depth := 0.52
	var width := 1.15
	var front := x + depth * 0.5

	for side_x in [-1.0, 1.0]:
		for side_z in [-1.0, 1.0]:
			_add_box(
				Vector3(
					x + side_x * depth * 0.3,
					ground + caster * 0.5,
					z + side_z * width * 0.4,
				),
				Vector3(0.11, caster, 0.11),
				RUBBER,
			)

	var body_bottom := ground + caster
	_add_box(
		Vector3(x, body_bottom + body_height * 0.5, z),
		Vector3(depth, body_height, width),
		TOOLBOX_RED,
	)
	_add_drawers(front, body_bottom, body_height, width, z, 3)

	# Encimera, que además separa cuerpo y cofre.
	var counter := body_bottom + body_height
	_add_box(
		Vector3(x, counter + 0.03, z),
		Vector3(depth + 0.05, 0.06, width + 0.05),
		CHROME,
	)

	# Cofre de arriba, algo más pequeño que el cuerpo.
	var chest_bottom := counter + 0.06
	_add_box(
		Vector3(x, chest_bottom + chest_height * 0.5, z),
		Vector3(depth - 0.06, chest_height, width - 0.12),
		TOOLBOX_RED,
	)
	_add_drawers(front - 0.03, chest_bottom, chest_height, width - 0.12, z, 2)


## Frentes de cajón con su tirador, repartidos por la altura de un cuerpo.
func _add_drawers(
	front_x: float, bottom: float, height: float, width: float, z: float, count: int
) -> void:
	var step := height / count
	for i in count:
		var center := bottom + step * (i + 0.5)
		_add_box(
			Vector3(front_x + 0.012, center, z),
			Vector3(0.025, step - 0.045, width - 0.07),
			TOOLBOX_DRAWER,
		)
		_add_box(
			Vector3(front_x + 0.035, center, z),
			Vector3(0.022, 0.035, width * 0.45),
			CHROME,
		)


## Cuña de subida al raíl, con la cara alta pegada al extremo delantero del
## hierro (`rail_front_z`) y bajando hacia +Z hasta el suelo.
##
## `PrismMesh` da un prisma de sección triangular: base de `size.x` por
## `size.z` y una ARISTA arriba paralela a Z, cuya posición en X manda
## `left_to_right` (1.0 = pegada a +X, o sea triángulo rectángulo, no
## isósceles). Girado 90° en Y, la X local pasa a ser -Z del mundo: la arista
## alta cae hacia atrás, contra el raíl, y la pendiente mira al espectador.
func _add_ramp(x: float, rail_front_z: float) -> MeshInstance3D:
	var ramp := MeshInstance3D.new()
	var mesh := PrismMesh.new()
	mesh.size = Vector3(RAMP_LENGTH, RAIL_HEIGHT, RAIL_WIDTH)
	mesh.left_to_right = 1.0
	ramp.mesh = mesh
	var world := _world_basis()
	ramp.basis = world * Basis(Vector3.UP, deg_to_rad(90.0))
	ramp.position = world * Vector3(
		x, -RAIL_HEIGHT * 0.5, rail_front_z + RAMP_LENGTH * 0.5
	)
	ramp.material_override = _flat_material(STEEL)
	add_child(ramp)
	return ramp


## Modelo GLB colocado con los ejes del mundo, como `_add_box()`, pero
## conservando sus propios materiales (nada de `material_override`).
func _add_model(
	path: String, offset: Vector3, scale_factor: float, yaw_degrees: float = 0.0
) -> Node3D:
	var model: Node3D = load(path).instantiate()
	var world := _world_basis()
	var yaw := Basis(Vector3.UP, deg_to_rad(yaw_degrees))
	model.basis = world * yaw.scaled(Vector3.ONE * scale_factor)
	model.position = world * offset
	add_child(model)
	return model


## Telón plano que hereda la orientación de cámara (sin `_world_basis()`), así
## que siempre queda de frente y tapa el encuadre entero.
func _add_backdrop(position_local: Vector3, size: Vector2, color: Color) -> MeshInstance3D:
	var wall := MeshInstance3D.new()
	var mesh := BoxMesh.new()
	mesh.size = Vector3(size.x, size.y, 0.4)
	wall.mesh = mesh
	wall.position = position_local
	# Es un telón, no geometría del garaje: ni proyecta ni recibe sombras. Sin
	# lo segundo, la sombra de la losa —que ya no aterriza en ningún suelo,
	# porque el garaje no tiene uno grande— viaja hasta el fondo y aparece un
	# paralelogramo gris flotando en el aire.
	wall.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	var material := _flat_material(color)
	material.disable_receive_shadows = true
	wall.material_override = material
	add_child(wall)
	return wall


## Cancela la rotación heredada de `View` — ver comentario de cabecera.
func _world_basis() -> Basis:
	return global_transform.basis.orthonormalized().inverse()


func _flat_material(color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	return material
