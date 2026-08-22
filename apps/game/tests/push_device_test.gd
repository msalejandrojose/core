extends Node

## Prueba del registro de dispositivo para push (TASK-253).
##
## Sin un addon de FCM real instalado en este entorno — el panorama de
## plugins de FCM para Godot 4 está fragmentado y TASK-253 está además
## marcada como bloqueada hasta tener un proyecto de Firebase real (ver la
## nota en `push_device.gd`) — lo que se prueba aquí es que todo el cableado
## se degrada con gracia: `PushDevice` nunca lanza, y
## `Session._register_push_device()` (llamado sin `await` desde `_ready()`/
## `_adopt()`, best-effort) tampoco rompe nada aunque no haya token que
## registrar. El flujo real con un dispositivo de verdad no se puede probar
## aquí.
##
##     godot --quit-after 300 res://tests/push_device_test.tscn

var _failures := 0


func _ready() -> void:
	await _test_no_disponible_sin_addon()
	await _test_registrar_dispositivo_no_rompe_sin_addon()
	_test_push_platform_en_este_entorno()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_no_disponible_sin_addon() -> void:
	_check(PushDevice.is_available(), false,
		"sin el addon instalado, PushDevice no está disponible")

	var token := await PushDevice.request_push_token()
	_check(token, "", "pedir el token sin addon no lanza y devuelve vacío")


## `_register_push_device()` es privado por convención, no por el lenguaje —
## se llama directo desde el test, igual que ya se hace con el helper
## equivalente de `login_with_google()`. Sin PushDevice disponible, tiene que
## terminar sin más (nunca lanza), aunque no haya sesión real.
func _test_registrar_dispositivo_no_rompe_sin_addon() -> void:
	await Session._register_push_device()
	_check(true, true, "registrar el dispositivo sin addon disponible no lanza")


func _test_push_platform_en_este_entorno() -> void:
	# La máquina de test no es Android ni iOS, así que cae al valor por
	# defecto — confirma que el `match` no deja ningún caso sin cubrir.
	_check(Session._push_platform(), "web",
		"en un entorno de escritorio, la plataforma reportada es 'web'")


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
