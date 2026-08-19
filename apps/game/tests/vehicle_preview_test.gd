extends Node

## Prueba del fondo de taller opcional de `VehiclePreview`:
##
##     godot --headless --quit-after 800 res://tests/vehicle_preview_test.tscn
##
## Solo el menú principal lo pide (`add_workshop_backdrop()`) — el taller de
## verdad (`workshop_screen.gd`) sigue con el visor transparente de siempre,
## sin tocarlo.

var _failures := 0


func _ready() -> void:
	_test_sin_pedirlo_el_visor_sigue_transparente()
	_test_pedirlo_monta_suelo_pared_y_banco()
	_test_pedirlo_no_rompe_el_modelo()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_sin_pedirlo_el_visor_sigue_transparente() -> void:
	var preview := VehiclePreview.new()
	add_child(preview)

	_check(preview._viewport.transparent_bg, true, "sin pedir el fondo de taller, el visor sigue transparente")
	_check(_count_mesh_instances(preview._viewport), 0, "y no hay ninguna malla de taller montada")

	preview.queue_free()


func _test_pedirlo_monta_suelo_pared_y_banco() -> void:
	var preview := VehiclePreview.new()
	add_child(preview)

	preview.add_workshop_backdrop()

	_check(preview._viewport.transparent_bg, false, "pedir el fondo de taller quita la transparencia")
	_check(_count_mesh_instances(preview._viewport), 3, "y monta suelo, pared y banco (3 mallas)")
	_check(_has_world_environment(preview._viewport), true, "con un WorldEnvironment propio para el color de fondo")

	preview.queue_free()


func _test_pedirlo_no_rompe_el_modelo() -> void:
	var preview := VehiclePreview.new()
	add_child(preview)

	preview.add_workshop_backdrop()
	preview.show_archetype("normal")

	_check(preview.has_model(), true, "pedir el fondo de taller no impide montar el coche")

	preview.queue_free()


# --- Utilidades ---------------------------------------------------------------

func _count_mesh_instances(root: Node) -> int:
	var count := 0
	for child in root.get_children():
		if child is MeshInstance3D:
			count += 1
	return count


func _has_world_environment(root: Node) -> bool:
	for child in root.get_children():
		if child is WorldEnvironment:
			return true
	return false


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
