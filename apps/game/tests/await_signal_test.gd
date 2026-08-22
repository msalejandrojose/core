extends Node

## Prueba de `AwaitSignal.first_or_timeout` — compartido por `PlatformAuth`
## y `PushDevice` para esperar la respuesta de un plugin nativo por señal,
## con un límite de tiempo si nunca llega.
##
## Regresión real: una lambda de GDScript captura variables locales POR
## VALOR, así que una primera versión de esta lógica (variables `bool`/
## `Variant` sueltas en vez de un `Array`) tenía un bug donde reasignar
## `done`/`result` dentro de la lambda de la señal nunca se veía desde el
## bucle que esperaba fuera — el resultado era esperar SIEMPRE el timeout
## completo, incluso cuando la señal llegaba al instante. Como el guard de
## disponibilidad de `PlatformAuth`/`PushDevice` corta antes de llegar aquí
## mientras no haya addon real instalado, ningún otro test lo ejercitaba —
## sin esta prueba el bug habría llegado intacto hasta el primer login/token
## real en un dispositivo.
##
##     godot --quit-after 300 res://tests/await_signal_test.tscn

signal _fake_signal(value: String)

var _failures := 0


func _ready() -> void:
	await _test_se_despierta_con_la_senal()
	await _test_devuelve_null_si_vence_el_timeout()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_se_despierta_con_la_senal() -> void:
	var start_ms := Time.get_ticks_msec()

	var trigger := get_tree().create_timer(0.05)
	trigger.timeout.connect(func() -> void:
		_fake_signal.emit("hola"))

	var result = await AwaitSignal.first_or_timeout(self, self, "_fake_signal", 20.0)

	var elapsed_ms := Time.get_ticks_msec() - start_ms
	_check(elapsed_ms < 500, true,
		"se despierta con la señal en vez de esperar el timeout completo")
	_check(result, "hola", "y devuelve el argumento que llevaba la señal")


## Timeout corto (0.1s) a propósito: sin esto la prueba tardaría lo que dure
## el timeout real de verdad.
func _test_devuelve_null_si_vence_el_timeout() -> void:
	var result = await AwaitSignal.first_or_timeout(self, self, "_fake_signal", 0.1)
	_check(result, null, "sin que llegue la señal, devuelve null al vencer el timeout")


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
