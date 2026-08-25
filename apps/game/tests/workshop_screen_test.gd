extends Node

const TestEnv := preload("res://tests/test_env.gd")

## Prueba de la pantalla de taller.
##
##     godot --headless --quit-after 800 res://tests/workshop_screen_test.tscn
##
## Los dos primeros casos son de humo (sin cuenta / sin servidor no rompe).
## Los siguientes usan un servidor falso de verdad (mismo diseño no
## bloqueante que `friends_screen_test.gd`) para probar que elegir una
## variante en la lista solo previsualiza — no llama a la API — hasta que se
## confirma con "Cambiar".

var _failures := 0

var _server := TCPServer.new()
var _port := 0
var _pending: Array = []  # cada uno: {"peer": StreamPeerTCP, "buffer": String}

var _catalog_payload := {
	# Envueltos con "owned" desde TASK-319 — misma forma que ya tenían los
	# skins, ahora también arquetipos y piezas.
	"archetypes": [
		{"archetype": {"id": "arch-normal", "code": "normal", "name": "Normal", "offroadGripModifier": 1.0}, "owned": true},
		{"archetype": {"id": "arch-f1", "code": "f1", "name": "F1", "offroadGripModifier": 0.7}, "owned": true},
		{"archetype": {"id": "arch-4x4", "code": "4x4", "name": "4x4", "offroadGripModifier": 1.3}, "owned": true},
		{"archetype": {"id": "arch-rally", "code": "rally", "name": "Rally", "offroadGripModifier": 1.5}, "owned": false},
		# Bloqueado pero a la venta (TASK-320): a diferencia del Rally de
		# arriba, este sí tiene que salir con un botón de compra tocable.
		{"archetype": {"id": "arch-elite", "code": "elite", "name": "Elite", "offroadGripModifier": 1.0, "priceCoins": 2000}, "owned": false},
	],
	"parts": [],
	# Uno desbloqueado y otro no — coches del backoffice (TASK pedida tras
	# las referencias: "ver todos los coches disponibles").
	"skins": [
		{
			"skin": {"id": "skin-purpura", "code": "purple", "name": "Púrpura", "modelPath": "res://models/vehicle-truck-purple.glb"},
			"owned": true,
		},
		{
			"skin": {"id": "skin-dorado", "code": "gold", "name": "Dorado", "modelPath": "res://models/vehicle-truck-gold.glb"},
			"owned": false,
		},
		{
			"skin": {"id": "skin-plata", "code": "silver", "name": "Plata", "modelPath": "res://models/vehicle-truck-silver.glb", "priceCoins": 500},
			"owned": false,
		},
	],
}
var _loadout_payload := {
	"archetype": {"id": "arch-normal", "code": "normal", "name": "Normal", "offroadGripModifier": 1.0},
	"tiresPart": null,
	"wingPart": null,
	"chassisPart": null,
	"skin": null,
	"stats": {"speedScale": 1.0, "grip": 1.0},
}
var _patch_count := 0
var _last_patch_body := ""
var _purchase_count := 0
var _last_purchase_type := ""
var _last_purchase_id := ""


func _ready() -> void:
	TestEnv.reset()
	Session.access_token = ""

	await _test_sin_cuenta_bloquea()
	await _test_con_cuenta_sin_servidor_no_rompe()

	_server.listen(0, "127.0.0.1")
	_port = _server.get_local_port()
	set_process(true)
	Session.access_token = "token-de-prueba"
	Api.access_token = "token-de-prueba"
	Api.base_url = "http://127.0.0.1:%d/v1" % _port

	await _test_elegir_variante_solo_previsualiza()
	await _test_cambiar_confirma_y_guarda()
	await _test_arquetipo_bloqueado_no_se_puede_tocar()
	await _test_coches_disponibles()
	await _test_comprar_arquetipo_bloqueado()

	_server.stop()
	Session.access_token = ""

	if _failures == 0:
		print("\nOK")
		get_tree().quit(0)
	else:
		print("\nFALLOS: %d" % _failures)
		get_tree().quit(1)


func _process(_delta: float) -> void:
	while _server.is_connection_available():
		_pending.append({"peer": _server.take_connection(), "buffer": ""})

	var still_pending: Array = []
	for entry in _pending:
		var peer: StreamPeerTCP = entry["peer"]
		if peer.get_available_bytes() > 0:
			entry["buffer"] += peer.get_data(peer.get_available_bytes())[1].get_string_from_utf8()

		if _is_request_complete(entry["buffer"]):
			_reply(peer, entry["buffer"])
		else:
			still_pending.append(entry)
	_pending = still_pending


func _is_request_complete(text: String) -> bool:
	var sep := text.find("\r\n\r\n")
	if sep == -1:
		return false

	var content_length := 0
	for line in text.substr(0, sep).split("\r\n"):
		if line.to_lower().begins_with("content-length:"):
			content_length = int(line.split(":")[1].strip_edges())

	return text.substr(sep + 4).length() >= content_length


func _reply(peer: StreamPeerTCP, text: String) -> void:
	var request_line := text.split("\r\n")[0] if text.length() > 0 else ""
	var sep := text.find("\r\n\r\n")
	var body := text.substr(sep + 4) if sep != -1 else ""

	var reply_body := "{}"
	if request_line.begins_with("GET") and request_line.find("/cars/catalog") != -1:
		reply_body = JSON.stringify(_catalog_payload)
	elif request_line.begins_with("GET") and request_line.find("/cars/me") != -1:
		reply_body = JSON.stringify(_loadout_payload)
	elif request_line.begins_with("PATCH") and request_line.find("/cars/me") != -1:
		_patch_count += 1
		_last_patch_body = body
		var parsed: Variant = JSON.parse_string(body)
		var archetype_id: String = parsed.get("archetypeId", "arch-normal") if parsed is Dictionary else "arch-normal"
		_loadout_payload["archetype"] = _find_archetype(archetype_id)
		var skin_id: Variant = parsed.get("skinId") if parsed is Dictionary else null
		_loadout_payload["skin"] = _find_skin_payload(skin_id) if skin_id != null else null
		reply_body = JSON.stringify(_loadout_payload)
	elif request_line.begins_with("POST") and request_line.find("/cars/shop/purchase") != -1:
		_purchase_count += 1
		var parsed: Variant = JSON.parse_string(body)
		_last_purchase_type = parsed.get("itemType", "") if parsed is Dictionary else ""
		_last_purchase_id = parsed.get("itemId", "") if parsed is Dictionary else ""
		# El servidor real marca el objeto como comprado y descuenta el
		# saldo; aquí basta con lo primero, que es lo único que el taller
		# vuelve a leer (`_reload_after_purchase` pide catálogo, no saldo).
		_mark_owned(_last_purchase_type, _last_purchase_id)
		reply_body = JSON.stringify({"balance": 0})

	var body_bytes := reply_body.to_utf8_buffer()
	var header := (
		"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n"
		% body_bytes.size())
	peer.put_data(header.to_utf8_buffer() + body_bytes)


func _find_archetype(id: String) -> Dictionary:
	for entry in _catalog_payload["archetypes"]:
		var archetype: Dictionary = entry["archetype"]
		if archetype["id"] == id:
			return archetype
	return _catalog_payload["archetypes"][0]["archetype"]


func _mark_owned(item_type: String, item_id: String) -> void:
	var key: String = {"ARCHETYPE": "archetype", "PART": "part", "SKIN": "skin"}.get(item_type, "")
	var list_key: String = {"ARCHETYPE": "archetypes", "PART": "parts", "SKIN": "skins"}.get(item_type, "")
	for entry in _catalog_payload.get(list_key, []):
		if entry[key]["id"] == item_id:
			entry["owned"] = true


func _find_skin_payload(id: String) -> Variant:
	for entry in _catalog_payload["skins"]:
		if entry["skin"]["id"] == id:
			return entry["skin"]
	return null


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


func _test_elegir_variante_solo_previsualiza() -> void:
	_loadout_payload["archetype"] = _find_archetype("arch-normal")
	_patch_count = 0

	var screen := await _open_screen()

	var f1_button := _find_button_text(screen, "F1")
	_check(f1_button != null, true, "aparece la variante F1 en la lista")

	f1_button.pressed.emit()
	await _settle()

	_check(screen._pending_archetype_id, "arch-f1", "elegirla actualiza la previsualización")
	# La vista 3D ya no es propia de esta pantalla (`_preview` no existe): el
	# modelo que cambia es el del garaje de fondo, vía
	# `RaceDirector.preview_archetype_body()` — sin un director de verdad en
	# este arnés (servidor falso, sin mundo 3D), no hay nada que comprobar
	# ahí. Lo que sí sigue siendo comprobable y es lo que importa de verdad
	# para este test: que previsualizar no guarda nada todavía.
	_check(_patch_count, 0, "pero no guarda nada todavía, sin pulsar Cambiar")
	_check(screen._loadout.get("archetype", {}).get("id", ""), "arch-normal",
		"el arquetipo aplicado de verdad sigue siendo el normal")

	screen.close_screen()


func _test_cambiar_confirma_y_guarda() -> void:
	_loadout_payload["archetype"] = _find_archetype("arch-normal")
	_patch_count = 0

	var screen := await _open_screen()

	var x4_button := _find_button_text(screen, "4x4")
	x4_button.pressed.emit()
	await _settle()

	var change_button := _find_button_text(screen, "Cambiar")
	_check(change_button.disabled, false, "Cambiar se activa al elegir otra variante")

	change_button.pressed.emit()
	await _settle()

	_check(_patch_count, 1, "confirmar guarda una única vez contra la API")
	_check(_last_patch_body.find("arch-4x4") != -1, true, "manda el arquetipo elegido")
	_check(screen._loadout.get("archetype", {}).get("id", ""), "arch-4x4",
		"y queda aplicado de verdad")

	screen.close_screen()


## Arquetipo del backoffice sin desbloquear todavía (TASK-319): se ve en la
## lista (para que el jugador sepa que existe) pero ni se puede previsualizar
## ni tocarlo cuenta como cambiar de variante.
func _test_arquetipo_bloqueado_no_se_puede_tocar() -> void:
	_loadout_payload["archetype"] = _find_archetype("arch-normal")
	_patch_count = 0

	var screen := await _open_screen()

	var locked_button := _find_button_text(screen, "🔒 Rally")
	_check(locked_button != null, true, "el arquetipo bloqueado aparece marcado como tal")
	_check(locked_button.disabled, true, "y no se puede tocar")
	_check(_patch_count, 0, "no dispara ninguna llamada a la API")

	screen.close_screen()


## Coches creados en el backoffice ("Coches disponibles"): el desbloqueado se
## puede equipar, el bloqueado no. A diferencia del arquetipo, elegir uno
## guarda al momento — no hay paso de "Cambiar" que confirmar, porque un
## skin no toca las stats (ver comentario en `_pick_skin`).
func _test_coches_disponibles() -> void:
	_loadout_payload["archetype"] = _find_archetype("arch-normal")
	_loadout_payload["skin"] = null
	_patch_count = 0

	var screen := await _open_screen()

	var owned_button := _find_button_text(screen, "Púrpura")
	_check(owned_button != null, true, "el coche desbloqueado aparece con su nombre")
	_check(owned_button.disabled, false, "y se puede tocar")

	var locked_button := _find_button_text(screen, "🔒 Dorado")
	_check(locked_button != null, true, "el coche bloqueado aparece marcado como tal")
	_check(locked_button.disabled, true, "y no se puede tocar")

	owned_button.pressed.emit()
	await _settle()

	_check(_patch_count, 1, "elegir un coche guarda al momento, sin pasar por Cambiar")
	_check(_last_patch_body.find("skin-purpura") != -1, true, "manda el id del coche elegido")
	_check(screen._loadout.get("skin", {}).get("id", ""), "skin-purpura",
		"y queda aplicado de verdad")

	screen.close_screen()


## Bloqueado pero a la venta (TASK-320): el botón muestra el precio y sí se
## puede tocar, y tocarlo compra al momento — sin paso de "Cambiar" ni de
## equipar aparte, igual que elegir un coche ya desbloqueado.
func _test_comprar_arquetipo_bloqueado() -> void:
	_loadout_payload["archetype"] = _find_archetype("arch-normal")
	_purchase_count = 0
	for entry in _catalog_payload["archetypes"]:
		if entry["archetype"]["id"] == "arch-elite":
			entry["owned"] = false

	var screen := await _open_screen()

	var buy_button := _find_button_text(screen, "🔒 Elite · 2000 monedas")
	_check(buy_button != null, true, "el arquetipo comprable aparece con su precio")
	_check(buy_button.disabled, false, "y se puede tocar, a diferencia de uno bloqueado sin precio")

	buy_button.pressed.emit()
	await _settle()

	_check(_purchase_count, 1, "comprarlo llama a la tienda una vez")
	_check(_last_purchase_type, "ARCHETYPE", "con el tipo correcto")
	_check(_last_purchase_id, "arch-elite", "y el id correcto")

	var unlocked_button := _find_button_text(screen, "Elite")
	_check(unlocked_button != null, true, "tras comprarlo aparece desbloqueado, sin candado")

	screen.close_screen()


# --- Utilidades ---------------------------------------------------------------

func _open_screen() -> Node:
	var screen: CanvasLayer = load("res://scenes/ui/workshop-screen.tscn").instantiate()
	add_child(screen)
	await _settle()
	return screen


func _settle() -> void:
	for i in 60:
		await get_tree().process_frame


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
