class_name VehiclePreview
extends SubViewportContainer

## Vista 3D en miniatura de un coche, montado y girando solo. Compartida entre
## el menú principal (coche equipado, `CarLoadout.archetype_code`) y el
## taller (coche que se está previsualizando antes de confirmar) para no
## duplicar la misma cámara/luces/rotación en los dos sitios.

const SPIN_SPEED := 0.6

var _viewport: SubViewport
var _pivot: Node3D
var _model: Node


## `_init()`, no `_ready()`: quien construye este menú a mano (`main_menu.gd`,
## `workshop_screen.gd`) espera poder llamar `show_archetype()` justo después
## de `VehiclePreview.new()`, antes incluso de añadirlo como hijo de nada —
## `_ready()` no sirve para eso porque Godot lo dispara diferido (una vez
## dentro del árbol, pero no de forma síncrona dentro de `add_child()`), y ese
## primer `show_archetype()` ya se ha quedado corto de tiempo.
func _init() -> void:
	stretch = true
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL

	_viewport = SubViewport.new()
	_viewport.size = Vector2i(640, 640)
	_viewport.transparent_bg = true
	_viewport.own_world_3d = true
	add_child(_viewport)

	var camera := Camera3D.new()
	# `look_at_from_position`, no `position` + `look_at`: al construirse en
	# código este nodo todavía no está dentro del árbol, y `look_at` necesita
	# `global_transform`.
	camera.look_at_from_position(Vector3(0, 2.3, 4.4), Vector3(0, 0.4, 0), Vector3.UP)
	_viewport.add_child(camera)

	var key_light := DirectionalLight3D.new()
	key_light.rotation_degrees = Vector3(-50, -30, 0)
	_viewport.add_child(key_light)

	var fill_light := DirectionalLight3D.new()
	fill_light.rotation_degrees = Vector3(-30, 150, 0)
	fill_light.light_energy = 0.35
	_viewport.add_child(fill_light)

	_pivot = Node3D.new()
	_viewport.add_child(_pivot)


func _process(delta: float) -> void:
	if _pivot != null:
		_pivot.rotate_y(delta * SPIN_SPEED)


## Cambia el modelo mostrado por el del arquetipo pedido — mismo mapa que usa
## `RaceDirector` al montar el coche en carrera, así que lo que se ve aquí es
## siempre el mismo modelo que se monta de verdad.
func show_archetype(archetype_code: String) -> void:
	if _model != null:
		_pivot.remove_child(_model)
		_model.queue_free()
		_model = null

	var path: String = RaceDirector.ARCHETYPE_MODELS.get(
		archetype_code, RaceDirector.ARCHETYPE_MODELS[CarLoadout.DEFAULT_ARCHETYPE_CODE])
	_model = load(path).instantiate()
	_pivot.add_child(_model)


func has_model() -> bool:
	return _model != null


## Suelo + pared + banco de taller alrededor del coche, con mallas
## primitivas (`BoxMesh`) y `StandardMaterial3D` — nada de imágenes ni
## modelos nuevos, gráficos de Godot tal cual pide la referencia. Opt-in:
## el taller de verdad (`workshop_screen.gd`) sigue con el fondo
## transparente de siempre, solo el menú principal lo pide (TASK "fondo de
## taller en el menú principal").
func add_workshop_backdrop() -> void:
	_viewport.transparent_bg = false

	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("cbb896")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("d8cdb8")
	env.ambient_light_energy = 0.7

	var world_env := WorldEnvironment.new()
	world_env.environment = env
	_viewport.add_child(world_env)

	var floor_instance := MeshInstance3D.new()
	var floor_mesh := BoxMesh.new()
	floor_mesh.size = Vector3(12, 0.2, 12)
	floor_instance.mesh = floor_mesh
	floor_instance.position = Vector3(0, -0.1, 0)
	floor_instance.material_override = _flat_material(Color("8a8378"))
	_viewport.add_child(floor_instance)

	var wall := MeshInstance3D.new()
	var wall_mesh := BoxMesh.new()
	wall_mesh.size = Vector3(12, 6, 0.3)
	wall.mesh = wall_mesh
	wall.position = Vector3(0, 2.9, -3.5)
	wall.material_override = _flat_material(Color("c9a876"))
	_viewport.add_child(wall)

	var bench := MeshInstance3D.new()
	var bench_mesh := BoxMesh.new()
	bench_mesh.size = Vector3(1.6, 0.9, 0.6)
	bench.mesh = bench_mesh
	bench.position = Vector3(-2.6, 0.45, -1.6)
	bench.material_override = _flat_material(Color("5b4636"))
	_viewport.add_child(bench)


func _flat_material(color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	return material
