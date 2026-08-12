extends Node

## Prueba de integración del circuito:
##
##     godot --quit-after 1800 res://tests/track_integration_test.tscn
##
## El `--quit-after` es un salvavidas: si el script no compila, Godot se queda
## corriendo la escena vacía con la ventana abierta y hay que matarlo a mano.
##
## Carga la escena real y arrastra la esfera física del coche por cada puerta.
## Verifica lo que el test unitario del cronómetro no puede: que las áreas
## estén donde toca, que la máscara de colisión vea al coche y solo al coche
## (el suelo del GridMap también es un cuerpo estático), y que la meta cierre.

var _failures := 0
var _completed := false


func _ready() -> void:
	var main: Node = load("res://scenes/main.tscn").instantiate()
	add_child(main)
	await get_tree().physics_frame

	var timer: LapTimer = main.get_node("LapTimer")
	var sphere: RigidBody3D = main.get_node("Vehicle/Sphere")

	_check_eq(timer.checkpoint_count, 3, "la escena aporta 3 checkpoints")

	timer.auto_start_on_throttle = false
	timer.lap_completed.connect(func(_d, _s): _completed = true)
	timer.start()

	for gate in ["Checkpoint0", "Checkpoint1", "Checkpoint2"]:
		var cp: Node3D = main.get_node(gate)
		await _move_to(sphere, cp.global_position)

	_check_eq(timer.remaining_checkpoints(), 0, "los 3 checkpoints se han cruzado")

	await _move_to(sphere, main.get_node("Finish").global_position)
	_check(_completed, true, "la meta cierra la vuelta")

	if _failures == 0:
		print("\nOK — 3/3")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _move_to(body: RigidBody3D, pos: Vector3) -> void:
	body.global_position = pos
	body.linear_velocity = Vector3.ZERO
	for i in 4:
		await get_tree().physics_frame


func _check(got: bool, want: bool, label: String) -> void:
	_report(got == want, label, want, got)


func _check_eq(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
