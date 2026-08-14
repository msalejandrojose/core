class_name TrackBuilder extends Node

## Construye el circuito en el GridMap a partir de un trazado del catálogo.
##
## Antes el circuito estaba cableado en `main.tscn` como un volcado binario de
## celdas. Construirlo aquí es lo que permite tener varios: la escena ya no sabe
## qué circuito es, solo cómo montar uno.

## Items de la mesh library. Los índices salen de `models/Library/mesh-library.tres`.
const ITEM_GRASS := 0
const ITEM_FOREST := 1
const ITEM_CORNER := 3
const ITEM_FINISH := 4
const ITEM_STRAIGHT := 6

## Índices de orientación ortogonal de GridMap, deducidos leyendo el circuito
## original: 0 identidad, 10 media vuelta, 16 y 22 los dos cuartos de vuelta.
const ROT_NONE := 0
const ROT_HALF := 10
const ROT_QUARTER_CW := 16
const ROT_QUARTER_CCW := 22

## Altura del volumen de los checkpoints sobre el asfalto.
const CHECKPOINT_HEIGHT := 1.1

## Cuánto se levanta el overlay de terreno sobre el asfalto. Nada que ver con
## la altura de un checkpoint: aquí basta con lo justo para no parpadear
## contra la pieza de debajo (z-fighting), no con despegarse del suelo.
const TERRAIN_OVERLAY_HEIGHT := 0.03

## Color por tipo de terreno de sección (TASK-271/274). El reskin de TEMA
## remapea la paleta del circuito ENTERO — aquí hace falta marcar la celda
## concreta, así que es una mancha translúcida encima del asfalto en vez de
## un cambio de textura. Sin entrada = asfalto = sin overlay.
const TERRAIN_COLORS := {
	TrackTerrain.Kind.ICE: Color(0.75, 0.88, 1.0, 0.55),
	TrackTerrain.Kind.MUD: Color(0.32, 0.22, 0.10, 0.65),
	TrackTerrain.Kind.WATER: Color(0.25, 0.55, 0.8, 0.55),
}

## Celdas de margen alrededor del circuito. Con menos, el asfalto acaba en un
## borde recto y se ve el vacío justo detrás de las vallas.
const DECORATION_MARGIN := 2

const CHECKPOINT_SCENE := preload("res://scenes/timing/checkpoint.tscn")

@export var grid_map_path: NodePath = ^"../GridMap"
@export var world_environment_path: NodePath = ^"../Environment"
@export var sun_path: NodePath = ^"../Sun"
@export var ground_shape_path: NodePath = ^"../Plane/CollisionShape3D"

var grid_map: GridMap
var world_environment: WorldEnvironment
var sun: DirectionalLight3D
var ground_shape: CollisionShape3D

## La librería y el entorno tal cual venían: son la base de la que se derivan
## los temas, así que hay que guardarlas antes de sustituir nada.
var _base_library: MeshLibrary
var _base_environment: Environment

## Transform de salida del último circuito construido.
var start_position: Vector3
var start_yaw: float

## Terreno de sección del circuito activo, tal cual venía en el `Layout`
## (TASK-271/273). Vive aquí y no en `Vehicle` porque es el circuito quien
## sabe qué hay en cada celda; `Vehicle` solo pregunta.
var _terrain_by_cell: Dictionary = {}


func _ready() -> void:
	grid_map = get_node(grid_map_path)
	world_environment = get_node(world_environment_path)
	sun = get_node(sun_path)
	ground_shape = get_node(ground_shape_path)

	_base_library = grid_map.mesh_library
	_base_environment = world_environment.environment


## Devuelve el nº de checkpoints intermedios colocados.
func build(layout: TrackCatalog.Layout) -> int:
	_clear()
	_apply_theme(layout.theme)
	_terrain_by_cell = layout.terrain

	var size := layout.path.size()
	for i in size:
		var cell := layout.path[i]
		var into := cell - layout.path[(i - 1 + size) % size]
		var out := layout.path[(i + 1) % size] - cell
		_place_track(cell, into, out, i == 0)

	_place_terrain_overlays(layout)
	_place_decorations(layout)
	_fit_ground(layout)

	var checkpoints := _place_checkpoints(layout)

	# La salida es la propia línea de meta, mirando hacia donde sigue el
	# circuito. Derivarla del trazado en vez de fijarla a mano es lo que hace
	# que valga igual para los tres y para los dos sentidos.
	var finish := layout.path[0]
	var forward := layout.path[1] - finish
	start_position = cell_center(finish)
	start_yaw = atan2(float(forward.x), float(forward.y))

	return checkpoints


## Centro de una celda en coordenadas de mundo. Se pregunta al GridMap en vez de
## multiplicar a mano por el tamaño de celda: así el tamaño, la escala y el
## desplazamiento del nodo se respetan solos.
func cell_center(cell: Vector2i) -> Vector3:
	return grid_map.to_global(grid_map.map_to_local(Vector3i(cell.x, 0, cell.y)))


## Terreno de sección bajo un punto del mundo (TASK-273). El GridMap colisiona
## como un único cuerpo — no dice qué celda golpeó un raycast — así que se
## convierte el punto de impacto a coordenadas de celda y se mira ahí. Encaja
## con el raycast que `Vehicle` ya dispara cada frame para orientar el modelo:
## no hace falta detección nueva, solo esta traducción.
func terrain_at(world_position: Vector3) -> TrackTerrain.Kind:
	var map_cell := grid_map.local_to_map(grid_map.to_local(world_position))
	var cell := Vector2i(map_cell.x, map_cell.z)
	return _terrain_by_cell.get(cell, TrackTerrain.Kind.ASPHALT)


## El tema se aplica ANTES de colocar celdas: cambiar la mesh library con el
## circuito ya puesto obliga a GridMap a reconstruir todas las instancias.
func _apply_theme(theme: TrackTheme.Kind) -> void:
	grid_map.mesh_library = TrackTheme.mesh_library(_base_library, theme)
	world_environment.environment = TrackTheme.environment(_base_environment, theme)
	sun.light_color = TrackTheme.sun_color(theme)


# --- Piezas -------------------------------------------------------------------

func _clear() -> void:
	grid_map.clear()
	for node in get_tree().get_nodes_in_group("checkpoint"):
		node.queue_free()
		# `queue_free` no saca del grupo hasta el final del frame, y el
		# cronómetro vuelve a escanear inmediatamente después de construir.
		node.remove_from_group("checkpoint")
	for node in get_tree().get_nodes_in_group("terrain-overlay"):
		node.queue_free()
		node.remove_from_group("terrain-overlay")


func _place_track(cell: Vector2i, into: Vector2i, out: Vector2i, is_finish: bool) -> void:
	var position := Vector3i(cell.x, 0, cell.y)

	if into == out:
		var item := ITEM_FINISH if is_finish else ITEM_STRAIGHT
		grid_map.set_cell_item(position, item, _straight_rotation(out))
		return

	# En una curva la pieza se orienta por sus dos lados abiertos: hacia la
	# celda anterior y hacia la siguiente.
	grid_map.set_cell_item(position, ITEM_CORNER, _corner_rotation(-into, out))


func _straight_rotation(direction: Vector2i) -> int:
	return ROT_NONE if direction.x == 0 else ROT_QUARTER_CW


func _corner_rotation(a: Vector2i, b: Vector2i) -> int:
	var west := a.x < 0 or b.x < 0
	var north := a.y > 0 or b.y > 0

	if west:
		return ROT_NONE if north else ROT_QUARTER_CCW
	return ROT_QUARTER_CW if north else ROT_HALF


## Mancha translúcida sobre cada celda con terreno de sección pintado, para
## que hielo/barro/agua se distingan a simple vista y no solo en el editor
## del backoffice (TASK-274). Una por celda pintada; el asfalto no lleva
## overlay, que por eso `TERRAIN_COLORS` no tiene entrada para él.
func _place_terrain_overlays(layout: TrackCatalog.Layout) -> void:
	if layout.terrain.is_empty():
		return

	var half := (cell_center(Vector2i(1, 0)) - cell_center(Vector2i(0, 0))).x * 0.5

	for cell in layout.terrain:
		var kind: TrackTerrain.Kind = layout.terrain[cell]
		if not TERRAIN_COLORS.has(kind):
			continue

		var plane := PlaneMesh.new()
		plane.size = Vector2(half * 2.0, half * 2.0)

		var material := StandardMaterial3D.new()
		material.albedo_color = TERRAIN_COLORS[kind]
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		material.disable_receive_shadows = true

		var overlay := MeshInstance3D.new()
		overlay.mesh = plane
		overlay.material_override = material
		overlay.add_to_group("terrain-overlay")

		add_child(overlay)
		overlay.global_position = cell_center(cell) + Vector3(0, TERRAIN_OVERLAY_HEIGHT, 0)


## Entorno del circuito: bosque alternado con hierba lisa.
##
## Toda celda del margen lleva pieza, aunque sea hierba pelada. Dejarla vacía
## abre un agujero en el suelo por el que se ve el cielo — se vio en captura,
## con el circuito flotando a trozos.
##
## El patrón de bosque es determinista: el mismo circuito se ve siempre igual,
## y dos jugadores ven lo mismo.
func _place_decorations(layout: TrackCatalog.Layout) -> void:
	var occupied := {}
	for cell in layout.path:
		occupied[cell] = true

	for cell in layout.path:
		for dx in range(-DECORATION_MARGIN, DECORATION_MARGIN + 1):
			for dz in range(-DECORATION_MARGIN, DECORATION_MARGIN + 1):
				var neighbour := cell + Vector2i(dx, dz)
				if occupied.has(neighbour):
					continue
				occupied[neighbour] = true

				var wooded := absi(neighbour.x * 7 + neighbour.y * 13) % 3 != 0
				grid_map.set_cell_item(
					Vector3i(neighbour.x, 0, neighbour.y),
					ITEM_FOREST if wooded else ITEM_GRASS,
					ROT_NONE)


## Ajusta el suelo con colisión al circuito construido.
##
## Las piezas de decoración son solo malla: quien sostiene al coche fuera del
## asfalto es este plano. Venía fijo a 60x60 desde el kit, que daba de sobra
## para el circuito original pero no para los nuevos — el nevado llega a x=-41
## y la herradura a z=34, así que el coche se caía por el borde del mundo en
## cuanto se salía de la pista.
func _fit_ground(layout: TrackCatalog.Layout) -> void:
	var box := ground_shape.shape as BoxShape3D
	if box == null:
		return

	var low := layout.path[0]
	var high := layout.path[0]
	for cell in layout.path:
		low = Vector2i(mini(low.x, cell.x), mini(low.y, cell.y))
		high = Vector2i(maxi(high.x, cell.x), maxi(high.y, cell.y))

	low -= Vector2i(DECORATION_MARGIN, DECORATION_MARGIN)
	high += Vector2i(DECORATION_MARGIN, DECORATION_MARGIN)

	# Media celda a cada lado: los centros no llegan al borde de su propia pieza.
	var half := (cell_center(Vector2i(1, 0)) - cell_center(Vector2i(0, 0))).x * 0.5
	var from := cell_center(low) - Vector3(half, 0, half)
	var to := cell_center(high) + Vector3(half, 0, half)

	box.size = Vector3(to.x - from.x, 0, to.z - from.z)
	ground_shape.global_position = Vector3((from.x + to.x) * 0.5, ground_shape.global_position.y, (from.z + to.z) * 0.5)


# --- Checkpoints --------------------------------------------------------------

## Repartidos a partes iguales por el trazado, saltándose la meta. Con tres
## checkpoints caen a un cuarto, la mitad y tres cuartos de vuelta.
func _place_checkpoints(layout: TrackCatalog.Layout) -> int:
	var size := layout.path.size()
	var count := mini(layout.checkpoints, size - 1)

	for i in count:
		var index := int(round(float(size) * float(i + 1) / float(count + 1)))
		var cell := layout.path[index % size]

		var checkpoint := CHECKPOINT_SCENE.instantiate()
		checkpoint.index = i
		add_child(checkpoint)
		checkpoint.global_position = cell_center(cell) + Vector3(0, CHECKPOINT_HEIGHT, 0)

	var finish := CHECKPOINT_SCENE.instantiate()
	finish.is_finish = true
	add_child(finish)
	finish.global_position = cell_center(layout.path[0]) + Vector3(0, CHECKPOINT_HEIGHT, 0)

	return count
