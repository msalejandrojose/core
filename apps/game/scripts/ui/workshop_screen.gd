extends CanvasLayer

## Taller: elegir arquetipo de coche (normal/4x4/F1) y coche del catálogo
## (skins del backoffice). Antes también dejaba equipar piezas (ruedas,
## alerón, chasis) con un panel derecho de rendimiento y barras, pero se
## retiró para simplificar la pantalla a una sola columna con lo esencial:
## comprar y seleccionar el coche.
##
## Cada toque en un skin guarda al momento contra la API (mismo patrón que
## Ajustes: sin botón "Guardar" aparte) y refresca `CarLoadout`. La única
## excepción es el arquetipo: la lista de variantes solo PREVISUALIZA (vista
## 3D + resaltado) hasta que se pulsa "Cambiar", para poder mirar las
## opciones sin comprometerse ni gastar una llamada a la API por cada vistazo.
##
## Las piezas equipadas se mandan siempre como `null` — el taller ya no
## permite tocarlas, pero se conservan como concepto en la API por si algún
## día vuelve el panel.
##
## Requiere cuenta: el equipamiento vive en el servidor por jugador
## (`GET/PATCH /racing/cars/me`), así que sin sesión no hay dónde guardarlo.

## Gris neutro de las píldoras sin elegir — mismo tono que usa `main_menu.gd`
## para sus opciones, ver comentario en `ui_theme.gd`.
const _OPTION_BG := Color("e9e4d9")

signal closed()

var _root: VBoxContainer
var _status: Label
var _body: HBoxContainer
var _wallet_label: Label

var _variants_list: VBoxContainer
var _change_button: Button

## El coche que cambia al elegir variante es el del garaje de fondo
## (`RaceDirector`, encontrado por grupo — ver comentario en
## `preview_archetype_body()`), no un visor propio: este taller ya no monta
## ninguna pantalla en medio, solo tarjetas flotando sobre el garaje.
var _director: Node

var _catalog: Dictionary = {}
var _loadout: Dictionary = {}
var _busy: bool = false

## Arquetipo que se está enseñando en la vista 3D ahora mismo — puede no ser
## todavía el que está aplicado de verdad (`_loadout.archetype`) hasta que se
## confirme con "Cambiar".
var _pending_archetype_id: String = ""

var _archetype_buttons: Dictionary = {}
## skin_id_or_"" (String) → Button — coches/skins creados en el backoffice.
var _skin_buttons: Dictionary = {}
var _all_buttons: Array[Button] = []


func _ready() -> void:
	layer = 9
	_director = get_tree().get_first_node_in_group("race_director")
	_build_shell()
	Wallet.changed.connect(_refresh_wallet)
	_refresh_wallet()

	if not Session.is_logged_in():
		_show_locked()
		return

	await _load()


func _build_shell() -> void:
	var backdrop := ColorRect.new()
	# Más claro que antes (0.985 → 0.45): las tarjetas del boceto flotan sobre
	# la escena 3D bien visible, no sobre un fondo casi negro.
	backdrop.color = UiTheme.ink_alpha(0.45)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 56)
	add_child(margin)

	_root = VBoxContainer.new()
	_root.add_theme_constant_override("separation", 16)
	margin.add_child(_root)

	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 16)
	_root.add_child(header)
	header.add_child(_title("Taller"))
	var header_spacer := Control.new()
	header_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(header_spacer)
	header.add_child(_build_wallet_badge())
	header.add_child(_button("Cerrar", close_screen))

	_status = _label(
		"Por ahora todos los coches compiten en la misma clasificación, "
		+ "sin importar el arquetipo o las piezas — eso cambiará cuando el "
		+ "arquetipo tenga su propia clasificación.", UiTheme.FONT_XS)
	# Sobre el fondo oscuro de la cabecera, no sobre una tarjeta clara — ver
	# el comentario de `_label()`.
	_status.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.7))
	_root.add_child(_status)


## Mismo lenguaje visual que la insignia de saldo del menú principal
## (`main_menu.gd`) — el taller es donde de verdad se gasta, así que tiene
## que estar tan a la vista como en el menú (criterio explícito de TASK-320).
func _build_wallet_badge() -> Control:
	var badge := UiTheme.card_panel(UiTheme.CARD, 14, 16)
	_wallet_label = Label.new()
	_wallet_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_wallet_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	badge.add_child(_wallet_label)
	return badge


func _refresh_wallet() -> void:
	if not is_instance_valid(_wallet_label):
		return
	_wallet_label.text = "🪙 %d" % Wallet.balance


func _show_locked() -> void:
	_status.text = "Necesitas una cuenta para usar el taller: entra desde \"Cuenta\" en el menú."
	_status.add_theme_color_override("font_color", UiTheme.BAD)


func close_screen() -> void:
	# Si se estaba mirando una variante sin confirmar, el coche del garaje
	# tiene que volver al equipado de verdad — si no, se queda enseñando
	# algo que en realidad no está puesto.
	if is_instance_valid(_director):
		_director.restore_equipped_body()
	closed.emit()
	queue_free()


# --- Carga y guardado -----------------------------------------------------------

func _load() -> void:
	_status.text = _status.text + "\n\nCargando…"

	var catalog_response = await RacingApi.car_catalog()
	var loadout_response = await RacingApi.car_loadout()

	if not catalog_response.ok or not (catalog_response.data is Dictionary) \
		or not loadout_response.ok or not (loadout_response.data is Dictionary):
		_status.text = "No se pudo cargar el taller. Comprueba la conexión e inténtalo de nuevo."
		_status.add_theme_color_override("font_color", UiTheme.BAD)
		return

	_catalog = catalog_response.data
	_loadout = loadout_response.data
	_pending_archetype_id = _loadout.get("archetype", {}).get("id", "")
	_build_loaded()


## Manda el estado completo (arquetipo + skin — las piezas se envían como
## null porque la UI ya no permite tocarlas). Si falla, se revierte la UI a
## lo último confirmado.
func _save() -> void:
	if _busy:
		return
	_busy = true
	_set_buttons_disabled(true)

	var archetype_id: String = _loadout.get("archetype", {}).get("id", "")
	var skin_id = _selected_skin_id()

	var response = await RacingApi.set_car_loadout(archetype_id, null, null, null, skin_id)

	_busy = false
	_set_buttons_disabled(false)

	if not response.ok or not (response.data is Dictionary):
		_flash_error(response.message if not response.message.is_empty() else "No se pudo guardar el cambio.")
		_pending_archetype_id = _loadout.get("archetype", {}).get("id", "")
		_sync_buttons()
		_show_preview(_pending_archetype_id)
		return

	_loadout = response.data
	await CarLoadout.refresh()
	_sync_buttons()


func _selected_skin_id():
	var current: Variant = _loadout.get("skin")
	return current.get("id") if current is Dictionary else null


# --- Construcción tras cargar -----------------------------------------------------

func _build_loaded() -> void:
	_status.text = _status.text.replace("\n\nCargando…", "")

	_body = HBoxContainer.new()
	_body.add_theme_constant_override("separation", 24)
	_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root.add_child(_body)

	_populate_body()

	_sync_buttons()
	_show_preview(_pending_archetype_id)


func _populate_body() -> void:
	# Solo un panel a la izquierda. El resto del cuerpo se deja libre para
	# que se vea el garaje 3D de fondo con el coche equipado — antes había
	# una segunda tarjeta a la derecha con rendimiento + piezas, retirada
	# para que la pantalla se centre en comprar y seleccionar el coche.
	_body.add_child(_build_variants_panel())
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_body.add_child(spacer)


## Tras comprar algo en la tienda (TASK-320): recarga catálogo y saldo, y
## reconstruye el cuerpo entero — más simple y fiable que ir tocando a mano
## el botón que cambió de bloqueado a comprado (y puede que otros que ahora
## sí se puedan pagar con el saldo nuevo). Comprar no es una acción tan
## frecuente como para que el coste de reconstruir importe.
func _reload_after_purchase() -> void:
	var catalog_response = await RacingApi.car_catalog()
	if catalog_response.ok and catalog_response.data is Dictionary:
		_catalog = catalog_response.data
	await Wallet.refresh()

	for child in _body.get_children():
		_body.remove_child(child)
		child.free()
	_archetype_buttons.clear()
	_skin_buttons.clear()
	_all_buttons.clear()

	_populate_body()
	_sync_buttons()
	_show_preview(_pending_archetype_id)


## Compra un arquetipo, pieza o skin bloqueado (TASK-320). No lo equipa —
## comprar y equipar son dos toques distintos, igual que en cualquier tienda:
## así un jugador puede comprar piezas para más adelante sin perder lo que
## lleva puesto ahora mismo.
func _purchase(item_type: String, item_id: String) -> void:
	if _busy:
		return
	_busy = true
	_set_buttons_disabled(true)

	var response = await RacingApi.purchase_car_item(item_type, item_id)

	_busy = false

	if not response.ok:
		_flash_error(response.message if not response.message.is_empty() else "No se pudo comprar.")
		_set_buttons_disabled(false)
		return

	await _reload_after_purchase()


## Columna izquierda ("VARIANTES DISPONIBLES" del boceto): lista vertical de
## arquetipos. Elegir uno solo cambia la vista previa — hace falta pulsar
## "Cambiar" para que se aplique de verdad y se guarde.
func _build_variants_panel() -> Control:
	var card := UiTheme.card_panel()
	card.custom_minimum_size = Vector2(300, 0)

	var panel := VBoxContainer.new()
	panel.add_theme_constant_override("separation", 12)
	card.add_child(panel)

	panel.add_child(_heading("Variantes disponibles"))

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(scroll)

	_variants_list = VBoxContainer.new()
	_variants_list.add_theme_constant_override("separation", 8)
	_variants_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_variants_list)

	var archetype_group := ButtonGroup.new()
	for entry in _catalog.get("archetypes", []):
		var archetype: Dictionary = entry.get("archetype", {})
		var id: String = archetype.get("id", "")
		var owned: bool = entry.get("owned", false)
		var price = archetype.get("priceCoins")
		var display_name: String = archetype.get("name", archetype.get("code", "?"))

		var button: Button
		if owned:
			button = _toggle_button(display_name, archetype_group)
			button.pressed.connect(func() -> void: _preview_archetype(id))
		elif price != null:
			# Coche del backoffice bloqueado pero a la venta (TASK-320): un
			# toque compra al momento — mismo criterio "tocar = comprometerse"
			# que ya usa "Coches disponibles" para equipar uno ya poseído.
			button = _button(
				"🔒 %s · %d monedas" % [display_name, int(price)],
				func() -> void: _purchase("ARCHETYPE", id))
		else:
			# Bloqueado y sin precio: existe pero no se puede ni previsualizar
			# ni comprar todavía (p.ej. un desbloqueable solo por racha).
			button = _toggle_button("🔒 %s" % display_name, archetype_group)
			button.disabled = true

		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		_variants_list.add_child(button)
		_archetype_buttons[id] = button

	_change_button = UiTheme.pill_button("Cambiar", UiTheme.GOOD, Color.WHITE)
	_change_button.pressed.connect(_confirm_archetype)
	_change_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_all_buttons.append(_change_button)
	panel.add_child(_change_button)

	# "Coches disponibles" — skins creados en el backoffice. Antes vivía en
	# el panel derecho junto a las piezas; se movió aquí al retirar ese
	# panel. Elegir uno guarda al momento, sin pasar por "Cambiar" — un
	# skin no toca las stats, así que no hay nada que previsualizar.
	panel.add_child(_heading("Coches disponibles"))
	var skins_row := HFlowContainer.new()
	skins_row.add_theme_constant_override("h_separation", 12)
	skins_row.add_theme_constant_override("v_separation", 12)
	panel.add_child(skins_row)

	var skin_group := ButtonGroup.new()

	var no_skin_button := _toggle_button("Ninguno", skin_group)
	no_skin_button.pressed.connect(func() -> void: _pick_skin(""))
	skins_row.add_child(no_skin_button)
	_skin_buttons[""] = no_skin_button

	for skin_entry in _catalog.get("skins", []):
		var skin: Dictionary = skin_entry.get("skin", {})
		var id: String = skin.get("id", "")
		var owned: bool = skin_entry.get("owned", false)
		var price = skin.get("priceCoins")
		var skin_name: String = skin.get("name", skin.get("code", "?"))

		var button: Button
		if owned:
			button = _toggle_button(skin_name, skin_group)
			button.pressed.connect(func() -> void: _pick_skin(id))
		elif price != null:
			button = _button(
				"🔒 %s · %d monedas" % [skin_name, int(price)],
				func() -> void: _purchase("SKIN", id))
		else:
			button = _toggle_button("🔒 %s" % skin_name, skin_group)
			button.disabled = true

		skins_row.add_child(button)
		_skin_buttons[id] = button

	return card


## Solo cambia lo que se ve (lista resaltada + coche 3D): no guarda nada
## todavía, para poder mirar las variantes sin gastar una llamada por cada
## vistazo.
func _preview_archetype(id: String) -> void:
	_pending_archetype_id = id
	_sync_buttons()
	_show_preview(id, true)


func _confirm_archetype() -> void:
	var committed_id: String = _loadout.get("archetype", {}).get("id", "")
	if _pending_archetype_id == committed_id or _pending_archetype_id == "":
		return
	_loadout["archetype"] = _find_wrapped(_catalog.get("archetypes", []), "archetype", _pending_archetype_id)
	_save()


func _show_preview(archetype_id: String, animate: bool = false) -> void:
	if not is_instance_valid(_director):
		return

	var archetype: Variant = _find_wrapped(_catalog.get("archetypes", []), "archetype", archetype_id)
	var code: String = archetype.get("code", CarLoadout.DEFAULT_ARCHETYPE_CODE) if archetype is Dictionary \
		else CarLoadout.DEFAULT_ARCHETYPE_CODE
	_director.preview_archetype_body(code, animate)


## Coche del backoffice elegido en "Coches disponibles". Guarda al momento,
## sin paso de "Cambiar" — a diferencia del arquetipo, un skin no cambia
## las stats, así que no hay nada que previsualizar antes de comprometerse.
func _pick_skin(id: String) -> void:
	_loadout["skin"] = _find_wrapped(_catalog.get("skins", []), "skin", id) if id != "" else null
	_save()


## Los tres catálogos (`archetypes`, `parts`, `skins`) tienen la misma forma
## desde la API (TASK-319): `[{<key>: {...}, owned: bool}]`, no una lista
## plana — de ahí este helper en vez de comparar `item.id` directamente.
## Devuelve el objeto de dentro, con la misma forma que ya trae `_loadout`.
func _find_wrapped(items: Array, key: String, id: String) -> Variant:
	for entry in items:
		var value: Dictionary = entry.get(key, {})
		if value.get("id", "") == id:
			return value
	return null


func _sync_buttons() -> void:
	for id in _archetype_buttons:
		_archetype_buttons[id].button_pressed = id == _pending_archetype_id

	var committed_id: String = _loadout.get("archetype", {}).get("id", "")
	if is_instance_valid(_change_button):
		_change_button.disabled = _pending_archetype_id == committed_id or _pending_archetype_id == ""

	var owned_archetype_ids := {}
	var purchasable_archetype_ids := {}
	for archetype_entry in _catalog.get("archetypes", []):
		var archetype: Dictionary = archetype_entry.get("archetype", {})
		var aid: String = archetype.get("id", "")
		if archetype_entry.get("owned", false):
			owned_archetype_ids[aid] = true
		elif archetype.get("priceCoins") != null:
			purchasable_archetype_ids[aid] = true
	for id in _archetype_buttons:
		# Bloqueado y sin desbloquear ni comprar: se queda deshabilitado pase
		# lo que pase con `_set_buttons_disabled`. Uno comprable, en cambio,
		# tiene que seguir tocable — es la única acción posible ahí.
		if not owned_archetype_ids.get(id, false) and not purchasable_archetype_ids.get(id, false):
			_archetype_buttons[id].disabled = true

	var selected_skin = _selected_skin_id()
	var owned_skin_ids := {"": true}
	var purchasable_skin_ids := {}
	for skin_entry in _catalog.get("skins", []):
		var skin: Dictionary = skin_entry.get("skin", {})
		var sid: String = skin.get("id", "")
		if skin_entry.get("owned", false):
			owned_skin_ids[sid] = true
		elif skin.get("priceCoins") != null:
			purchasable_skin_ids[sid] = true
	for id in _skin_buttons:
		var button: Button = _skin_buttons[id]
		# Un botón de compra no es de tipo toggle, así que no tiene
		# `button_pressed` que sincronizar — solo los ya equipables lo son.
		if owned_skin_ids.get(id, false):
			button.button_pressed = id == (selected_skin if selected_skin != null else "")
		# No desbloqueado ni comprable: se queda deshabilitado pase lo que
		# pase con `_set_buttons_disabled` — un toque ahí no puede llegar a
		# `_pick_skin` ni a `_purchase`.
		if not owned_skin_ids.get(id, false) and not purchasable_skin_ids.get(id, false):
			button.disabled = true


func _flash_error(message: String) -> void:
	var previous := _status.text
	var previous_color := _status.get_theme_color("font_color")
	_status.text = message
	_status.add_theme_color_override("font_color", UiTheme.BAD)
	await get_tree().create_timer(2.5).timeout
	if is_instance_valid(_status):
		_status.text = previous
		_status.add_theme_color_override("font_color", previous_color)


func _set_buttons_disabled(disabled: bool) -> void:
	for button in _all_buttons:
		button.disabled = disabled
	if disabled and is_instance_valid(_change_button):
		_change_button.disabled = true
	elif not disabled:
		_sync_buttons()


# --- Piezas -----------------------------------------------------------------------

func _title(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	label.add_theme_color_override("font_color", UiTheme.BONE)
	return label


func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	return label


## Texto atenuado dentro de una tarjeta clara — todo salvo `_status`, que se
## repinta a `BONE` justo al crearse porque vive sobre el fondo oscuro de la
## cabecera, no sobre una tarjeta.
func _label(text: String, font_size: int) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	return label


## Píldora gris sin elegir / verde al elegir — arquetipo y piezas comparten
## el mismo lenguaje visual de "opción" (ver `main_menu.gd`).
func _toggle_button(text: String, group: ButtonGroup) -> Button:
	var button := UiTheme.pill_button(
		text, _OPTION_BG, UiTheme.CARD_INK, UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM,
		UiTheme.GOOD, Color.WHITE)
	button.toggle_mode = true
	button.button_group = group
	_all_buttons.append(button)
	return button


## Píldora metálica oscura, para "Cerrar" en la cabecera — sobre el fondo
## atenuado, no sobre una tarjeta clara.
func _button(text: String, on_pressed: Callable) -> Button:
	var button := UiTheme.pill_button(text, UiTheme.STEEL, Color.WHITE)
	button.pressed.connect(on_pressed)
	_all_buttons.append(button)
	return button
