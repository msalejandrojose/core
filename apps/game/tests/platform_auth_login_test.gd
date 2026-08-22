extends Node

## Prueba del login nativo de plataforma (Play Games / Game Center).
##
## Sin addon real instalado (no hay Android/iOS SDK en este entorno) —
## `Engine.has_singleton(...)` es `false` aquí mismo en la máquina de test,
## igual que lo será en el editor o en desktop. Eso es justo lo que hay que
## probar: que `PlatformAuth` se degrada con gracia (vacío, no una excepción)
## y que `login_screen` no ofrece un botón que no puede funcionar en esta
## plataforma. El flujo completo con el SDK real respondiendo de verdad no se
## puede probar aquí — necesita el addon instalado y un dispositivo real (ver
## la nota en `platform_auth.gd`).
##
## El helper compartido de "señal contra timeout" (`AwaitSignal`) tiene su
## propia prueba en `await_signal_test.gd` — no se repite aquí.
##
##     godot --quit-after 300 res://tests/platform_auth_login_test.tscn

var _failures := 0


func _ready() -> void:
	await _test_disponibilidad_falsa_sin_addon()
	await _test_request_play_games_vacio_sin_addon()
	await _test_request_game_center_vacio_sin_addon()
	await _test_login_with_play_games_falla_sin_red()
	await _test_login_with_game_center_falla_sin_red()
	await _test_pantalla_no_ofrece_botones_nativos_en_este_entorno()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_disponibilidad_falsa_sin_addon() -> void:
	_check(PlatformAuth.is_play_games_available(), false,
		"sin el addon instalado, Play Games no está disponible")
	_check(PlatformAuth.is_game_center_available(), false,
		"sin el addon instalado, Game Center no está disponible")


func _test_request_play_games_vacio_sin_addon() -> void:
	var code := await PlatformAuth.request_play_games_server_auth_code()
	_check(code, "", "sin el addon, pedir el server auth code no lanza y devuelve vacío")


func _test_request_game_center_vacio_sin_addon() -> void:
	var payload := await PlatformAuth.request_game_center_identity_payload()
	_check(payload.is_empty(), true,
		"sin el addon, pedir la firma de identidad no lanza y devuelve vacío")


## `login_with_play_games()`/`login_with_game_center()` tienen que fallar de
## forma controlada (ApiResponse.ok == false) SIN llegar a tocar la red,
## porque `PlatformAuth` ya cortó antes — nada que canjear.
func _test_login_with_play_games_falla_sin_red() -> void:
	var response = await Session.login_with_play_games()
	_check(response.ok, false, "sin Play Games disponible, el login falla de forma controlada")
	_check(response.code, "PLATFORM_AUTH_UNAVAILABLE",
		"con el código que distingue esto de un rechazo del servidor")


func _test_login_with_game_center_falla_sin_red() -> void:
	var response = await Session.login_with_game_center()
	_check(response.ok, false, "sin Game Center disponible, el login falla de forma controlada")
	_check(response.code, "PLATFORM_AUTH_UNAVAILABLE",
		"con el código que distingue esto de un rechazo del servidor")


## En esta máquina `OS.get_name()` no es "Android" ni "iOS", así que ninguno
## de los dos botones nativos debería aparecer — evita que la pantalla
## ofrezca un botón que no puede funcionar aquí.
func _test_pantalla_no_ofrece_botones_nativos_en_este_entorno() -> void:
	var screen: CanvasLayer = load("res://scenes/ui/login-screen.tscn").instantiate()
	add_child(screen)
	await get_tree().process_frame

	_check(_find_button(screen, "Entrar con Play Games") == null, true,
		"sin Android real, no se ofrece el botón de Play Games")
	_check(_find_button(screen, "Entrar con Game Center") == null, true,
		"sin iOS real, no se ofrece el botón de Game Center")

	screen.queue_free()


# --- Utilidades ---------------------------------------------------------------

func _find_button(root: Node, text: String) -> Button:
	if root is Button and root.text == text:
		return root
	for child in root.get_children():
		var found := _find_button(child, text)
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
