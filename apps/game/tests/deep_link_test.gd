extends Node

## Prueba de deep links entrantes (`DeepLink`) y de que el login de Google
## reacciona a uno en vez de esperar al siguiente tick de polling.
##
## Sin el addon `godot-sdk-integrations/godot-deeplink` instalado en este
## entorno (no hay Android/iOS real), `DeepLink` nunca recibe un enlace de
## verdad del sistema operativo — lo que se prueba aquí es 1) que se degrada
## con gracia sin el addon, y 2) que SI llega la señal `link_received`
## (simulada a mano, igual que se simula `LiveRaceSocket` en otros arneses),
## `Session` corta la espera de inmediato en vez de esperar el intervalo de
## polling completo. El flujo real de extremo a extremo (SO abre el enlace →
## trae la app al frente) no se puede probar aquí — necesita el addon
## instalado y un dispositivo real.
##
##     godot --quit-after 300 res://tests/deep_link_test.tscn

var _failures := 0


func _ready() -> void:
	_test_no_disponible_sin_addon()
	await _test_login_con_google_se_despierta_con_el_deep_link()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _test_no_disponible_sin_addon() -> void:
	_check(DeepLink.is_available(), false,
		"sin el addon instalado, DeepLink no está disponible")


## El helper de `Session` corta la espera en cuanto llega la señal, en vez de
## esperar los 2s completos del intervalo de polling (`GOOGLE_POLL_INTERVAL_S`).
## El disparo va en un timer aparte de 0.05s: el propio helper conecta su
## escucha de forma síncrona nada más entrar (antes de su primer `await`
## interno), así que para cuando el timer dispara ya está escuchando.
func _test_login_con_google_se_despierta_con_el_deep_link() -> void:
	var start_ms := Time.get_ticks_msec()

	var trigger := get_tree().create_timer(0.05)
	trigger.timeout.connect(func() -> void:
		DeepLink.link_received.emit("/google-callback", {"state": "some-session-id"}))

	await Session._await_poll_tick_or_google_deep_link()

	var elapsed_ms := Time.get_ticks_msec() - start_ms
	_check(elapsed_ms < 500, true,
		"el deep link corta la espera mucho antes del intervalo completo de polling (2s)")


func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
