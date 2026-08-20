extends Node3D

## Fondo de garaje que se ve detrás del menú y del taller en vez del
## circuito de carreras — pedido explícitamente: el circuito no tiene que
## verse de fondo, solo el garaje. Mismas mallas primitivas que
## `VehiclePreview.add_workshop_backdrop()` (sin imágenes ni modelos
## nuevos), a la escala del mundo 3D real en vez de un `SubViewport` en
## miniatura.
##
## Cuelga de `View`, no de `Main`: `View` sigue al `Vehicle` cada frame
## (cámara de persecución, ver `view.gd`) y el coche se congela en un sitio
## distinto según el circuito elegido — como hijo de `View` el garaje se
## queda siempre centrado en cámara, sin depender de dónde esté la salida
## de cada pista. `RaceDirector` decide cuándo se ve (`visible`), igual que
## decide cuándo se ven el `GridMap` y el `Vehicle` de verdad.

func _ready() -> void:
	var floor_instance := MeshInstance3D.new()
	var floor_mesh := BoxMesh.new()
	floor_mesh.size = Vector3(22, 0.3, 22)
	floor_instance.mesh = floor_mesh
	floor_instance.position = Vector3(0, -0.3, 0)
	floor_instance.material_override = _flat_material(Color("8a8378"))
	add_child(floor_instance)

	var wall := MeshInstance3D.new()
	var wall_mesh := BoxMesh.new()
	wall_mesh.size = Vector3(22, 11, 0.6)
	wall.mesh = wall_mesh
	wall.position = Vector3(0, 5.2, -6.3)
	wall.material_override = _flat_material(Color("c9a876"))
	add_child(wall)

	var bench := MeshInstance3D.new()
	var bench_mesh := BoxMesh.new()
	bench_mesh.size = Vector3(2.9, 1.6, 1.1)
	bench.mesh = bench_mesh
	bench.position = Vector3(-4.7, 0.8, -2.9)
	bench.material_override = _flat_material(Color("5b4636"))
	add_child(bench)


func _flat_material(color: Color) -> StandardMaterial3D:
	var material := StandardMaterial3D.new()
	material.albedo_color = color
	return material
