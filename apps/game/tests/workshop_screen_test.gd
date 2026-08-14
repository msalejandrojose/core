extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de humo de la pantalla de taller: sin cuenta debe bloquear con un
## mensaje claro, y con cuenta pero sin servidor debe fallar sin romperse (no
## hay servidor real en este entorno, así que no se prueba el flujo completo
## de cargar catálogo/equipar — eso queda para probar a mano).
##
##     godot --headless --quit-after 600 res://tests/workshop_screen_test.tscn

var _failures := 0


func _ready() -> void:
	TestEnv.reset()
	Session.access_token = ""

	await _test_sin_cuenta_bloquea()
	await _test_con_cuenta_sin_servidor_no_rompe()

	Session.access_token = ""

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_sin_cuenta_bloquea() -> void:
	Session.access_token = ""

	var screen: CanvasLayer = load("res://scenes/ui/workshop-screen.tscn").instantiate()
	add_child(screen)
	await get_tree().process_frame

	_check(screen.get("_status") != null, true, "sin cuenta muestra un mensaje")
	_check(_find_button_text(screen, "Cerrar") != null, true, "sin cuenta hay botón para cerrar")

	screen.queue_free()
	await get_tree().process_frame


func _test_con_cuenta_sin_servidor_no_rompe() -> void:
	Session.access_token = "fake-token-para-el-test"
	# Puerto que rechaza la conexión al instante: falla rápido y a propósito,
	# sin esperar a los 10s de timeout de una IP que no contesta.
	Api.base_url = "http://127.0.0.1:1/v1"

	var screen: CanvasLayer = load("res://scenes/ui/workshop-screen.tscn").instantiate()
	add_child(screen)

	# Da tiempo a que la petición falle y la pantalla reaccione, sin colgarse
	# esperando algo que nunca llega.
	for i in 60:
		await get_tree().process_frame

	_check(_find_button_text(screen, "Cerrar") != null, true,
		"sin servidor, la pantalla no se rompe y deja cerrar")

	screen.queue_free()
	await get_tree().process_frame
	Api.refresh_base_url()


# --- Utilidades ---------------------------------------------------------------

func _find_button_text(node: Node, text: String) -> Button:
	if node is Button and node.text == text:
		return node
	for child in node.get_children():
		var found := _find_button_text(child, text)
		if found != null:
			return found
	return null


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
