class_name Ghost extends Node3D

## Coche fantasma que repite en playback la mejor vuelta grabada (TASK-220).
##
## Puramente visual: un `Node3D` que se coloca a mano interpolando entre
## instantáneas, sin física ni colisión — por diseño no puede chocar con el
## coche del jugador, y no hace falta preocuparse de que lo haga.
##
## Formato de grabación (TASK-219, decisión de partida): snapshots a ~20 Hz
## con interpolación en el cliente, no reproducir inputs — Godot no garantiza
## física determinista entre dispositivos, y un fantasma que se desvía a
## mitad de vuelta es peor que no tener fantasma.

const MODEL_PATH := "res://models/vehicle-truck-yellow.glb"
## Azulado y medio transparente: tiene que verse a la legua que es un
## fantasma, no otro coche de verdad en pista. Color por defecto — el propio
## récord y los amigos usan este; los rivales de una carrera online
## (TASK-285) llevan uno propio para distinguirse entre ellos.
const GHOST_COLOR := Color(0.45, 0.75, 1.0, 0.4)

var _snapshots: Array = []
var _model: Node
var _color: Color


func _init(color: Color = GHOST_COLOR) -> void:
	_color = color


func _ready() -> void:
	visible = false


## `snapshots` es lo que graba `RaceDirector` durante una vuelta: cada
## elemento `{"t": int (ms desde la salida), "pos": Vector3, "yaw": float}`,
## en orden de tiempo ascendente. Vacío o null = sin fantasma que mostrar —
## el criterio de done de TASK-220 es explícito: sin récord previo, no
## aparece ninguno.
func set_snapshots(snapshots: Array) -> void:
	_snapshots = snapshots
	visible = not _snapshots.is_empty()
	if visible and _model == null:
		_build_model()


## Se llama cada frame con el tiempo transcurrido de la vuelta EN CURSO del
## jugador: el fantasma no tiene su propio reloj, revive la grabación al
## mismo ritmo que el jugador vive la suya.
func update_at(elapsed_ms: int) -> void:
	if _snapshots.is_empty():
		return

	var next_index := _snapshots.size()
	for i in _snapshots.size():
		if int(_snapshots[i]["t"]) >= elapsed_ms:
			next_index = i
			break

	if next_index <= 0:
		_apply(_snapshots[0])
		return
	if next_index >= _snapshots.size():
		_apply(_snapshots[_snapshots.size() - 1])
		return

	var a: Dictionary = _snapshots[next_index - 1]
	var b: Dictionary = _snapshots[next_index]
	var span: int = int(b["t"]) - int(a["t"])
	var t: float = 0.0 if span <= 0 else clampf(
		float(elapsed_ms - int(a["t"])) / float(span), 0.0, 1.0)

	position = (a["pos"] as Vector3).lerp(b["pos"] as Vector3, t)
	rotation.y = lerp_angle(float(a["yaw"]), float(b["yaw"]), t)


func _apply(snapshot: Dictionary) -> void:
	position = snapshot["pos"]
	rotation.y = snapshot["yaw"]


func _build_model() -> void:
	_model = load(MODEL_PATH).instantiate()
	add_child(_model)
	_tint(_model)


func _tint(node: Node) -> void:
	if node is MeshInstance3D:
		var mesh: MeshInstance3D = node
		var material := StandardMaterial3D.new()
		material.albedo_color = _color
		material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		# Sin sombra propia: un fantasma que proyecta sombra sólida deja de
		# parecerlo.
		mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		for i in mesh.mesh.get_surface_count():
			mesh.set_surface_override_material(i, material)

	for child in node.get_children():
		_tint(child)
