extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba del cliente HTTP contra una API REAL:
##
##     # en apps/api:  PORT=3101 node dist/main.js
##     godot --quit-after 3000 res://tests/api_client_test.tscn
##
## No hay mocks a propósito. Lo que puede fallar aquí no es la lógica del
## cliente, que son treinta líneas: es que el formato de una respuesta no sea el
## que se supone, que un error llegue con otra forma, o que el token no viaje.
## Un mock que devuelve lo que yo creo que devuelve la API no prueba nada de eso.
##
## Si la API no está levantada, el test lo dice y se salta en vez de fallar: no
## queremos una suite roja por no tener el backend a mano.
##
## ⚠️ Escribe en la base de datos de desarrollo: deja un tiempo real por
## ejecución. Es el precio de probar contra la API de verdad.

const BASE_URL := "http://localhost:3101/v1"
const EMAIL := "msalejandrojose7@gmail.com"
const PASSWORD := "G0venture"

var _failures := 0


func _ready() -> void:
	TestEnv.reset()
	Api.base_url = BASE_URL

	var reachable = await Api.get_json("/racing/tracks", false)
	# 401 significa que la API está viva y protegiendo el endpoint, que es justo
	# lo que se espera sin token.
	if reachable.is_network_error():
		print("  — API no disponible en %s, test omitido" % BASE_URL)
		get_tree().quit(0)
		return

	_check_eq(reachable.status, 401, "sin token, la API responde 401")
	_check(reachable.is_unauthorized(), true, "y el cliente lo reconoce")

	await _test_login()
	await _test_tracks()
	await _test_submit_lap()
	await _test_leaderboard()
	await _test_rechazo_del_anticheat()

	Session.logout()

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


# --- Casos --------------------------------------------------------------------

func _test_login() -> void:
	var bad = await Session.login(EMAIL, "contrasena-incorrecta")
	_check(bad.ok, false, "una contraseña mala no entra")
	_check(Session.is_logged_in(), false, "y no deja sesión a medias")

	var good = await Session.login(EMAIL, PASSWORD)
	_check(good.ok, true, "el login correcto entra")
	_check(Session.is_logged_in(), true, "y deja sesión")
	_check_eq(Session.email, EMAIL, "con el email del usuario")
	_check(Api.access_token != "", true, "el cliente adopta el token")


func _test_tracks() -> void:
	var response = await RacingApi.tracks()
	_check(response.ok, true, "los circuitos llegan con el token puesto")

	var slugs := []
	if response.ok and response.data is Dictionary:
		for track in response.data.get("data", []):
			slugs.append(track.get("slug"))

	# Los circuitos del cliente tienen que existir en el servidor, en los dos
	# sentidos: si no, subir un tiempo fallaría con 404 justo al cruzar meta.
	var missing := []
	for id in TrackCatalog.ids():
		for suffix in ["", "-rev"]:
			if not slugs.has(id + suffix):
				missing.append(id + suffix)
	_check_eq(missing, [], "todos los circuitos del juego existen en la API")


## Solo se sube UNA vuelta por ejecución, y a propósito: el anti-cheat rechaza
## un segundo intento que llegue antes de que diera tiempo a correrlo, así que
## encadenar dos aquí probaría el rechazo, no el envío.
##
## Por lo mismo no se puede afirmar que sea récord personal: la API guarda el
## histórico, y en la segunda ejecución el mismo tiempo ya no mejora nada. Se
## comprueba la FORMA de la respuesta, que es lo que el cliente consume.
func _test_submit_lap() -> void:
	var splits := [10120, 21400, 33900, 42350]
	var response = await RacingApi.submit_lap("kenney-01", 42350, splits)

	_check(response.ok, true, "una vuelta normal se acepta")
	if response.ok:
		_check_eq(typeof(response.data.get("personalBest")), TYPE_BOOL, "responde si es récord personal")
		_check(int(response.data.get("position", 0)) >= 1, true, "y con posición en el ranking")
		_check(response.data.get("lapTime") is Dictionary, true, "devolviendo la vuelta guardada")


func _test_leaderboard() -> void:
	var response = await RacingApi.leaderboard("kenney-01")
	_check(response.ok, true, "el leaderboard llega")

	if response.ok:
		_check(response.data.get("entries").size() > 0, true, "con al menos una entrada")
		_check(response.data.get("yourPosition") != null, true, "y con tu posición")

	# El sentido inverso es otro leaderboard: el tiempo de antes no puede estar.
	var reverse = await RacingApi.leaderboard("kenney-01-rev")
	_check(reverse.ok, true, "el inverso también responde")
	if reverse.ok:
		_check_eq(reverse.data.get("entries").size(), 0, "y está vacío, es otro ranking")


func _test_rechazo_del_anticheat() -> void:
	# Cinco segundos en un circuito cuyo mínimo físico son nueve.
	var response = await RacingApi.submit_lap("kenney-01", 5000, [1000, 2000, 3000, 5000])

	_check(response.ok, false, "una vuelta imposible se rechaza")
	_check_eq(response.code, "RACING_IMPLAUSIBLE_LAP_TIME", "con el código del anti-cheat")
	# Y el cliente tiene que saber que esto NO es un problema de red: reintentar
	# no va a arreglarlo nunca.
	_check(response.is_network_error(), false, "y no se confunde con un fallo de red")


# --- Utilidades ---------------------------------------------------------------

func _check(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _check_eq(got, want, label: String) -> void:
	_report(got == want, label, want, got)


func _report(ok: bool, label: String, want, got) -> void:
	if ok:
		print("  ok   %s" % label)
	else:
		print("  FALLA %s — esperado %s, obtenido %s" % [label, want, got])
		_failures += 1
