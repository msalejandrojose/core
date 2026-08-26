extends CanvasLayer

## Menú principal, a partir de una segunda captura de referencia más
## detallada que la que dio origen al hub de pestañas (TASK-256/257): ya no
## es una lista de pestañas que cambian el contenido de la derecha — es
## "Modos de juego" (Carrera Rápida / Grand Prix / Time Trial) eligiendo QUÉ
## hace "Empezar Carrera", con la configuración de circuito/cilindrada
## siempre visible a la derecha. Taller/Amigos/Clasificaciones pasan a ser
## lanzadores sueltos (barra superior o botón bajo el coche), no pestañas
## con contenido propio — Clasificaciones se lleva su lógica a
## `leaderboard-screen.tscn`, que antes vivía aquí dentro.
##
## Dos tarjetas flotando, no tres columnas: modos a la izquierda y
## configuración de carrera a la derecha, con el garaje de verdad de fondo
## en medio (`MenuGarage` + el coche equipado, ver `race_director.gd`) — sin
## panel ni visor 3D propio ahí, sería una pantalla flotando encima del
## garaje en vez del garaje mismo.
##
## Del circuito solo se ve UNA tarjeta, la del elegido ahora mismo (antes
## había una rejilla 2×2 con los cuatro locales): para cambiar está "Más
## circuitos", que abre `TrackSelectScreen` y es además la única vista que
## enseña los creados en el backoffice, así que aquí sobraba media selección
## duplicada.
##
## Sentido (Normal/Inverso) YA NO tiene control aquí, por petición expresa.
## Ojo: el ajuste sigue vivo en `GameSettings` y las carreras lo respetan —
## lo que desaparece es la forma de tocarlo, no el dato. Si alguien tenía
## Inverso guardado de antes, se queda así.
##
## Cilindrada es un `HSlider` de 3 paradas, no tres píldoras.
##
## Los tres modos son botones con icono dibujado a la izquierda (ver
## `mode_icon.gd`) y el nombre en caja alta a la derecha.
##
## Tarjetas claras (`UiTheme.card_panel()`/`pill_button()`), mismo criterio
## que el resto de este pase de diseño — ver comentario en `ui_theme.gd`.

## Colores de los botones de opción sin elegir (modo, cilindrada): gris
## neutro, verde al elegir — mismo lenguaje que el taller.
const _OPTION_BG := Color("e9e4d9")

## Un color liso por circuito, mientras no haya miniatura de verdad —
## índice paralelo a `TrackCatalog.all()`.
const _TRACK_PLACEHOLDER_COLORS := [
	Color("8fbf6b"), Color("d9a441"), Color("6b98bf"), Color("eef1f5"),
]

signal play_pressed()
## Emparejamiento resuelto (TASK-282/284/285): `target`/`threat` son lo que
## devolvió `RacingApi.match_online_race()`, cada uno vacío si ese rival no
## existe para esta combinación.
signal play_online_pressed(target: Dictionary, threat: Dictionary)
## Contrarreloj de 3 vueltas (TASK-312): mismo circuito/sentido/cilindrada ya
## elegidos arriba, sin selección propia.
signal time_trial_pressed()

## Qué hace "Empezar Carrera" — no una pestaña con contenido propio, una
## elección de entre las tres que decide qué señal/pantalla dispara el
## mismo botón de abajo.
enum Mode { CARRERA_RAPIDA, GRAND_PRIX, TIME_TRIAL }

const ModeIcon := preload("res://scripts/ui/mode_icon.gd")

const MODES := [
	[Mode.CARRERA_RAPIDA, "Carrera Rápida", ModeIcon.Kind.FLAG],
	[Mode.GRAND_PRIX, "Grand Prix", ModeIcon.Kind.TROPHY],
	[Mode.TIME_TRIAL, "Time Trial", ModeIcon.Kind.STOPWATCH],
]

var _active_mode: int = Mode.CARRERA_RAPIDA
var _mode_buttons: Dictionary = {}  # Mode (int) -> Button

## Persistentes: viven en la cabecera/columnas fijas, no en contenido que se
## reconstruye — aquí ya no hay pestañas que limpiar y volver a montar.
var _account_subtitle: Label
var _account_button: Button
var _wallet_label: Label

var _track_summary_label: Label
## Hueco donde vive la tarjeta del circuito ACTUAL: se vacía y se vuelve a
## llenar en cada `_sync()`, porque su contenido (nombre, portada) depende de
## cuál esté elegido.
var _current_track_slot: VBoxContainer
## Id de circuito local → `TextureRect` de su tarjeta rápida — mismo
## mecanismo que `track_select_screen.gd` para la imagen de portada subida
## en el backoffice.
var _cover_thumbnails: Dictionary = {}
var _cc_slider: HSlider
var _cc_labels: Array[Label] = []
var _best_label: Label
var _start_button: Button
var _online_button: Button
## Distinto de `_online_button` (fantasmas asíncronos, TASK-284): esta es la
## fase online real (TASK-323) — jugadores conectados a la vez de verdad,
## con matchmaking por nivel y rivales ficticios si hace falta rellenar.
var _live_button: Button


func _ready() -> void:
	layer = 8
	_ensure_built()
	# La mejor marca depende del arquetipo desde TASK-233: si cambia en el
	# taller (que se abre encima de este menú, sin cerrarlo), el número tiene
	# que refrescarse solo, sin esperar a que se toque circuito/cilindrada.
	CarLoadout.changed.connect(_refresh_best)
	# Saldo de monedas (TASK-320): puede cambiar en el taller (ganar por
	# carrera, gastar en la tienda) sin que este menú se reabra.
	Wallet.changed.connect(_refresh_wallet)

	# Una vez por sesión basta (TASK-228): la temporada rota cada hora en el
	# servidor como mucho, no varias veces mientras el menú sigue montado.
	SeasonProgress.check(GameSettings.track_key())


## El director abre el menú desde su propio `_ready`, que corre ANTES que el de
## este nodo porque está antes en la escena. Así que la construcción tiene que
## poder dispararse desde cualquiera de los dos, y una sola vez.
func _ensure_built() -> void:
	if _account_subtitle == null:
		_build()


func open() -> void:
	_ensure_built()
	visible = true
	_sync()


func close() -> void:
	visible = false


func _build() -> void:
	var backdrop := ColorRect.new()
	backdrop.color = UiTheme.ink_alpha(0.45)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 40)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 16)
	margin.add_child(column)

	column.add_child(_build_header())

	var body := HBoxContainer.new()
	body.add_theme_constant_override("separation", 24)
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	column.add_child(body)

	body.add_child(_build_modes_panel())

	# Sin panel central: entre las dos tarjetas se ve el garaje de verdad
	# (con el coche equipado dentro) en vez de una pantalla propia — mismo
	# criterio que `workshop_screen.gd`.
	var body_spacer := Control.new()
	body_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.add_child(body_spacer)

	body.add_child(_build_race_config_panel())

	_sync()
	_load_track_covers()


## Título a la izquierda, barra de accesos sueltos a la derecha (Ajustes /
## Amigos / Clasificaciones / Entrar-Salir) — ya no hay pestaña que abra
## cada uno, son lanzadores directos, mismo patrón que ya usaba Ajustes.
func _build_header() -> Control:
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 16)

	var title_column := VBoxContainer.new()
	header.add_child(title_column)

	# A FONT_DISPLAY (72) este título mide ~1240px y no cabe: la cabecera es
	# título + contador + chapa de accesos (~670px), y pasa de los 1840
	# útiles. El desbordamiento no recorta el título, empuja TODO a la derecha
	# y deja el botón de cuenta fuera de pantalla — comprobado en captura.
	title_column.add_child(UiTheme.title_label("Racing World - Menú principal", UiTheme.FONT_XL))

	# Subtítulo de estado de cuenta: nivel 1b (marcador), o sea el mismo
	# lenguaje del título —caja alta, contorno— pero pequeño. El texto lo pone
	# `_refresh_account()`, que también lo pasa a caja alta.
	_account_subtitle = UiTheme.marker_label("", UiTheme.FONT_XS)
	# Sin esto, la frase de cuenta ("Juegas sin cuenta...") pide todo su
	# ancho en una línea y estira la cabecera (y con ella toda la pantalla)
	# más allá del borde derecho — mismo motivo que en `_best_label`.
	_account_subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_account_subtitle.custom_minimum_size = Vector2(560, 0)
	title_column.add_child(_account_subtitle)

	var push := Control.new()
	push.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(push)

	header.add_child(_build_wallet_badge())

	header.add_child(_build_access_block())

	return header


## Los accesos de la cabecera, como UNA pieza metálica con segmentos pulsables
## en vez de cuatro píldoras sueltas. Orden pedido, de izquierda a derecha:
## Ajustes, Amigos, Clasificaciones y la cuenta al extremo derecho (su texto
## alterna Entrar/Salir según la sesión, ver `_refresh_account()`).
func _build_access_block() -> Control:
	var block := PanelContainer.new()
	block.add_theme_stylebox_override("panel", UiTheme.metal_block())
	# Sin esto el panel se estira a lo alto de la cabecera, que es tan alta
	# como el título + el subtítulo de cuenta, y la chapa sale desproporcionada.
	block.size_flags_vertical = Control.SIZE_SHRINK_CENTER

	var bar := HBoxContainer.new()
	# Cero separación y las divisiones a mano: si el contenedor separa, entre
	# segmento y segmento se ve el fondo y deja de leerse como una pieza.
	bar.add_theme_constant_override("separation", 0)
	block.add_child(bar)

	bar.add_child(_icon_button("⚙ Ajustes", func() -> void:
		add_child(load("res://scenes/ui/settings-screen.tscn").instantiate())))
	bar.add_child(_segment_divider())
	bar.add_child(_icon_button("👥 Amigos", func() -> void:
		add_child(load("res://scenes/ui/friends-screen.tscn").instantiate())))
	bar.add_child(_segment_divider())
	bar.add_child(_icon_button("🏆 Clasificaciones", func() -> void:
		add_child(load("res://scenes/ui/leaderboard-screen.tscn").instantiate())))
	bar.add_child(_segment_divider())

	_account_button = _icon_button("🚪 Salir", _open_account)
	bar.add_child(_account_button)

	return block


## Ranura entre dos segmentos de la chapa: una línea oscura, como la junta de
## una pieza troquelada.
func _segment_divider() -> Control:
	var line := ColorRect.new()
	line.color = Color(0, 0, 0, 0.28)
	line.custom_minimum_size = Vector2(2, 40)
	line.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return line


## "CREDITOS: N" de la referencia (TASK-320) — sin cuenta se queda a 0, las
## monedas viven en el servidor por jugador, igual que el resto de `Wallet`.
func _build_wallet_badge() -> Control:
	var badge := PanelContainer.new()
	# La misma chapa que los accesos de al lado, pero en blanco, para que se
	# lean como dos piezas del mismo juego y no como una tarjeta junto a una
	# barra. `SHRINK_CENTER` por lo mismo que allí: si no, se estira a lo alto
	# de la cabecera y queda una pastilla larguísima al lado de la barra.
	badge.add_theme_stylebox_override("panel", UiTheme.metal_block(UiTheme.CARD))
	badge.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	for side in ["left", "right"]:
		badge.add_theme_constant_override("margin_" + side, 18)
	for side in ["top", "bottom"]:
		badge.add_theme_constant_override("margin_" + side, 14)

	_wallet_label = UiTheme.label_text("", UiTheme.FONT_SM, UiTheme.CARD_INK)
	badge.add_child(_wallet_label)
	return badge


func _refresh_wallet() -> void:
	if not is_instance_valid(_wallet_label):
		return
	_wallet_label.text = "🪙 %d" % Wallet.balance


## Columna izquierda ("MODOS DE JUEGO" del boceto): elegir modo no cambia lo
## que se ve a la derecha, cambia lo que hace "Empezar Carrera" — ver
## `_start_race()`.
func _build_modes_panel() -> Control:
	var card := UiTheme.card_panel()
	card.custom_minimum_size = Vector2(280, 0)

	var inner := VBoxContainer.new()
	inner.add_theme_constant_override("separation", 12)
	card.add_child(inner)

	inner.add_child(_heading("Modos de juego"))

	var mode_group := ButtonGroup.new()
	for entry in MODES:
		var mode: int = entry[0]
		var button := _mode_button(entry[1], entry[2])
		button.toggle_mode = true
		button.button_group = mode_group
		button.button_pressed = mode == _active_mode
		button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		button.pressed.connect(func() -> void: _pick_mode(mode))
		inner.add_child(button)
		_mode_buttons[mode] = button

	# Sin columna central propia: el coche equipado ya se ve aparcado en el
	# garaje de fondo (`MenuGarage` + `RaceDirector`, ver `race_director.gd`)
	# — pedido explícito, nada de una "pantalla" con su propio visor 3D
	# flotando en medio del menú. El acceso al Taller se queda aquí, bajo
	# los modos, que es el único sitio que le quedaba.
	var workshop_button := _action_button(UiTheme.pill_button(
		"🔧 Ir al taller", UiTheme.STEEL, Color.WHITE, Vector2(0, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_SM))
	workshop_button.pressed.connect(func() -> void:
		# Mismo motivo que `_open_track_select()`: el fondo del taller es
		# translúcido a propósito (ver `workshop_screen.gd`), y sin ocultar
		# este menú su propio texto se quedaba asomando debajo, duplicado.
		var screen: CanvasLayer = load("res://scenes/ui/workshop-screen.tscn").instantiate()
		screen.closed.connect(open)
		close()
		add_child(screen))
	inner.add_child(workshop_button)

	return card


## Columna derecha ("CONFIGURACIÓN DE CARRERA" del boceto): circuito y
## cilindrada, siempre visibles sea cual sea el modo elegido a la
## izquierda — Grand Prix y Time Trial reutilizan el mismo circuito/cc que
## Carrera Rápida (Grand Prix en realidad no los usa, pero no vale la pena
## esconder/mostrar la tarjeta entera solo por eso).
func _build_race_config_panel() -> Control:
	# Margen y separación algo más ajustados que en la tarjeta de modos
	# (`card_panel()`/separación por defecto): esta tarjeta tiene bastante
	# más contenido apilado (circuito + sentido + cilindrada + CTAs) y sin
	# recortar aquí no cabía entero en una pantalla de 1080 de alto.
	var card := UiTheme.card_panel(UiTheme.CARD, UiTheme.CARD_CORNER_RADIUS, 18)
	card.custom_minimum_size = Vector2(460, 0)
	card.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 8)
	card.add_child(content)

	content.add_child(_heading("Configuración de carrera"))
	content.add_child(_heading("Circuito"))

	_track_summary_label = Label.new()
	_track_summary_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_track_summary_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	content.add_child(_track_summary_label)

	# Una sola tarjeta, la del circuito ACTUAL, en vez de la rejilla 2×2 con
	# los cuatro locales: para cambiar está "Más circuitos", que abre la
	# pantalla completa y además es la única que enseña los del backoffice.
	# La tarjeta se reconstruye en `_sync()`, porque su contenido depende de
	# cuál esté elegido.
	_current_track_slot = VBoxContainer.new()
	content.add_child(_current_track_slot)

	var more_tracks := _action_button(UiTheme.pill_button(
		"Más circuitos", _OPTION_BG, UiTheme.CARD_INK, Vector2(0, 68), UiTheme.FONT_SM))
	more_tracks.pressed.connect(_open_track_select)
	content.add_child(more_tracks)

	var cc_column := VBoxContainer.new()
	cc_column.add_theme_constant_override("separation", 4)
	cc_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(cc_column)

	cc_column.add_child(_sub_heading("Dificultad/Clase"))

	var cc_values := [GameSettings.EngineClass.CC50, GameSettings.EngineClass.CC100, GameSettings.EngineClass.CC150]

	_cc_slider = HSlider.new()
	_cc_slider.min_value = 0
	_cc_slider.max_value = cc_values.size() - 1
	_cc_slider.step = 1
	_cc_slider.tick_count = cc_values.size()
	_cc_slider.ticks_on_borders = true
	# Slider más alto (32 → 44) para que el pulgar tenga sitio en móvil.
	_cc_slider.custom_minimum_size = Vector2(0, 44)
	# Deja hueco para que la etiqueta central ("Normal"/"Inverso" queda a la
	# izquierda con su propia columna) no choque con el borde de la tarjeta.
	_cc_slider.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	_cc_slider.value_changed.connect(func(v: float) -> void: _pick_engine(int(v)))
	cc_column.add_child(_cc_slider)

	var cc_labels_row := HBoxContainer.new()
	cc_column.add_child(cc_labels_row)
	for value in cc_values:
		var label := Label.new()
		label.text = GameSettings.ENGINE_NAMES[value]
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		# Cilindrada subida de SM a MD (28 → 32): antes se veía muy pequeña,
		# reportado como poco legible en móvil.
		label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
		cc_labels_row.add_child(label)
		_cc_labels.append(label)

	_best_label = Label.new()
	# Sin esto, una frase larga ("Aún no has corrido esta combinación de
	# circuito y cilindrada.") pide todo su ancho en una sola línea y estira
	# la tarjeta entera más allá del borde de la pantalla — el resto de
	# columnas de esta tarjeta ya son más estrechas que ese texto.
	_best_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_best_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_best_label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	content.add_child(_best_label)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(spacer)

	# Dos filas explícitas, no un `HFlowContainer` que decida el envolvido
	# solo: con la tarjeta a 460 de ancho, tres botones de 320 de ancho fijo
	# no caben ni dos por fila, así que el flow los apilaba los TRES, uno por
	# fila (284px de alto solo en botones). Con `size_flags_horizontal`
	# expandido en vez de un ancho fijo, "Empezar Carrera" y "Multijugador
	# Online" reparten el ancho de la tarjeta en su propia fila.
	var buttons_column := VBoxContainer.new()
	buttons_column.add_theme_constant_override("separation", 10)
	content.add_child(buttons_column)

	var primary_row := HBoxContainer.new()
	primary_row.add_theme_constant_override("separation", 12)
	buttons_column.add_child(primary_row)

	_start_button = _action_button(UiTheme.pill_button(
		"Empezar Carrera", UiTheme.GOOD, Color.WHITE, Vector2(0, 76), UiTheme.FONT_SM))
	_start_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_start_button.pressed.connect(_start_race)
	primary_row.add_child(_start_button)

	# Solo tiene sentido en Carrera Rápida: el emparejamiento compara contra
	# el leaderboard del circuito elegido, algo que Grand Prix y Time Trial
	# no usan (TASK-284).
	_online_button = _action_button(UiTheme.pill_button(
		"Multijugador Online", UiTheme.BLUE, Color.WHITE, Vector2(0, 76), UiTheme.FONT_SM))
	_online_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_online_button.pressed.connect(_on_online_pressed)
	primary_row.add_child(_online_button)

	_live_button = _action_button(UiTheme.pill_button(
		"🔴 Carrera en Vivo", UiTheme.CLAY, Color.WHITE, Vector2(0, 76), UiTheme.FONT_SM))
	_live_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_live_button.pressed.connect(_on_live_pressed)
	buttons_column.add_child(_live_button)

	return card


## Tarjeta del circuito ACTUAL, la única que se ve en el menú. Antes había
## una rejilla 2×2 con los cuatro locales; ahora para cambiar se pasa por
## "Más circuitos", que además es la única vista que enseña los del
## backoffice, así que aquí sobraba media selección duplicada.
##
## Se reconstruye entera en vez de actualizarse en sitio porque el circuito
## puede pasar a ser uno del servidor, que no está en `TrackCatalog` ni tiene
## color de marcador asignado.
func _rebuild_current_track_card() -> void:
	if not is_instance_valid(_current_track_slot):
		return

	for child in _current_track_slot.get_children():
		# `queue_free()` a secas no basta: es diferido hasta el final del
		# frame, así que dos `_sync()` seguidos (que los hay — al abrir el
		# menú y al volver de la pantalla de circuitos) apilarían tarjetas.
		# `remove_child()` los saca del árbol ya.
		_current_track_slot.remove_child(child)
		child.queue_free()

	var id := GameSettings.track_id
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override(
		"panel", UiTheme.card_stylebox_selected(UiTheme.CLAY, UiTheme.CARD, 14))
	_current_track_slot.add_child(panel)

	var inner := VBoxContainer.new()
	inner.add_theme_constant_override("separation", 6)
	panel.add_child(inner)

	var holder := Control.new()
	# Más alto que las miniaturas de la rejilla de antes (44): al ser una
	# sola, hay sitio de sobra y la portada se aprecia de verdad. Ampliado
	# después de las quejas de que se veía pequeño (120 → 180).
	holder.custom_minimum_size = Vector2(0, 180)
	inner.add_child(holder)

	var index := TrackCatalog.ids().find(id)
	var swatch := ColorRect.new()
	swatch.color = _TRACK_PLACEHOLDER_COLORS[index % _TRACK_PLACEHOLDER_COLORS.size()] \
		if index != -1 else UiTheme.STEEL
	swatch.set_anchors_preset(Control.PRESET_FULL_RECT)
	holder.add_child(swatch)

	# Encima del color liso: en cuanto `_load_track_covers()` encuentre la
	# variante de "portada" de este circuito con imagen subida en el
	# backoffice, la textura tapa el color.
	var thumbnail := TextureRect.new()
	thumbnail.set_anchors_preset(Control.PRESET_FULL_RECT)
	thumbnail.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	thumbnail.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	thumbnail.clip_contents = true
	holder.add_child(thumbnail)
	_cover_thumbnails[id] = thumbnail

	var name_label := UiTheme.label_text(
		_track_display_name(id), UiTheme.FONT_SM, UiTheme.CARD_INK)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	inner.add_child(name_label)


func _pick_track(id: String) -> void:
	GameSettings.set_track_id(id, false)
	_sync()


## Cada circuito local no tiene una fila propia en la base de datos — son
## 18 por circuito (cilindrada × sentido × arquetipo, ver `seed-racing.ts`),
## así que la imagen subida en el backoffice se busca en la variante de
## "portada" (100cc/normal/sin invertir) de cada uno. Sin red, o sin nadie
## que haya subido nada todavía, las tarjetas se quedan con su color liso —
## no es un error, es el estado normal hasta que un admin suba las fotos.
func _load_track_covers() -> void:
	var response = await RacingApi.tracks(100)
	if not response.ok or not (response.data is Dictionary):
		return

	for item in response.data.get("data", []):
		var slug: String = str(item.get("slug", ""))
		var image_url_value: Variant = item.get("imageUrl")
		var image_url: String = image_url_value if image_url_value is String else ""
		if image_url == "":
			continue

		# Solo hay una tarjeta montada (la del circuito actual), pero se
		# recorren todas las portadas conocidas: la tarjeta se reconstruye al
		# cambiar de circuito y `_cover_thumbnails` conserva la referencia de
		# la que esté viva en ese momento.
		for id in _cover_thumbnails.keys():
			if slug == _cover_slug(id) and is_instance_valid(_cover_thumbnails[id]):
				var texture := await RacingApi.fetch_image_texture(image_url)
				if is_instance_valid(_cover_thumbnails[id]) and texture != null:
					_cover_thumbnails[id].texture = texture
				break


## Mismo criterio que `track_select_screen.gd` — ver el comentario ahí.
func _cover_slug(local_id: String) -> String:
	return "%s-100cc-normal" % local_id


func _open_track_select() -> void:
	var screen: CanvasLayer = load("res://scenes/ui/track-select-screen.tscn").instantiate()
	screen.confirmed.connect(_sync)
	# El fondo de `screen` es a propósito translúcido (para que se vea la
	# escena 3D detrás, ver comentario en `track_select_screen.gd`) — sin
	# ocultar este menú, su propio texto y botones se quedaban asomando
	# debajo, duplicados encima de los de `screen`. `close()`/`open()` son
	# los mismos que usa `race_director.gd`; no esconden a `screen`, que
	# gestiona su propia capa (`CanvasLayer` anidado, no hijo de verdad a
	# efectos de render).
	screen.closed.connect(open)
	close()
	add_child(screen)


func _pick_mode(mode: int) -> void:
	_active_mode = mode
	for m in _mode_buttons:
		_mode_buttons[m].button_pressed = m == mode
	_sync_start_buttons()


## Abre la pantalla nueva de selección de Grand Prix (con imagen y detalles
## de cada copa). Cuando el jugador confirma una copa, se cierra sola y
## delega en la pantalla vieja de flujo (`grand-prix-screen.tscn`), que
## arranca/reanuda el intento y encadena las mangas.
func _open_grand_prix_select() -> void:
	var screen = load("res://scenes/ui/grand-prix-select-screen.tscn").instantiate()
	add_child(screen)
	screen.back_requested.connect(func() -> void: pass)
	screen.start_race.connect(_on_grand_prix_start_race)


func _on_grand_prix_start_race(gp_id: String) -> void:
	# `preselected_gp_id` en la pantalla vieja hace que se salte su propia
	# lista y arranque directamente el GP elegido en la nueva select.
	var screen = load("res://scenes/ui/grand-prix-screen.tscn").instantiate()
	screen.preselected_gp_id = gp_id
	add_child(screen)


## "Empezar Carrera" hace una cosa distinta según el modo elegido a la
## izquierda — Grand Prix abre la selección de copas (`_open_grand_prix_select`)
## en vez de instanciar directamente el flujo de mangas.
func _start_race() -> void:
	match _active_mode:
		Mode.CARRERA_RAPIDA:
			play_pressed.emit()
		Mode.GRAND_PRIX:
			_open_grand_prix_select()
		Mode.TIME_TRIAL:
			time_trial_pressed.emit()


func _sync_start_buttons() -> void:
	if not is_instance_valid(_online_button):
		return
	_online_button.visible = _active_mode == Mode.CARRERA_RAPIDA
	if _active_mode == Mode.CARRERA_RAPIDA:
		_online_button.disabled = not Session.is_logged_in()

	if not is_instance_valid(_live_button):
		return
	_live_button.visible = _active_mode == Mode.CARRERA_RAPIDA
	if _active_mode == Mode.CARRERA_RAPIDA:
		_live_button.disabled = not Session.is_logged_in()


func _pick_engine(value: int) -> void:
	GameSettings.set_engine_class(value)
	_refresh_best()


## Refleja lo que hay guardado — se llama al abrir el menú y cada vez que
## cambia algo (circuito, cuenta), no solo una vez, porque Ajustes o la
## pantalla de circuitos pueden haber tocado cosas por su cuenta mientras
## este menú seguía montado detrás.
func _sync() -> void:
	if not is_instance_valid(_track_summary_label):
		return

	_track_summary_label.text = _track_display_name(GameSettings.track_id)
	_rebuild_current_track_card()

	if is_instance_valid(_cc_slider):
		_cc_slider.value = GameSettings.engine_class
	for i in _cc_labels.size():
		_cc_labels[i].add_theme_color_override(
			"font_color", UiTheme.CLAY if i == GameSettings.engine_class else UiTheme.CARD_MUTED)

	_sync_start_buttons()
	_refresh_account()
	_refresh_best()
	_refresh_wallet()


## El nombre solo se conoce de verdad para los 4 del catálogo local — uno del
## servidor no tiene aquí un nombre en caché (vive en su propia pantalla), así
## que se enseña el slug tal cual. Es una pérdida cosmética menor: sigue
## identificando sin ambigüedad qué circuito hay elegido.
func _track_display_name(id: String) -> String:
	if TrackCatalog.ids().has(id):
		return TrackCatalog.by_id(id).name
	return id


## La mejor marca del circuito y cilindrada seleccionados: cada combinación
## guarda la suya, así que el número tiene que cambiar al tocar cualquiera
## de los dos. Puede llegar (vía `CarLoadout.changed`) antes de que el menú
## se haya construido nunca, en cuyo caso `_best_label` es null.
func _refresh_best() -> void:
	if not is_instance_valid(_best_label):
		return
	var key := GameSettings.track_key()
	if RaceRecords.has_best(key):
		var script := load("res://scripts/ui/race_hud.gd")
		_best_label.text = "Tu mejor vuelta aquí:  %s" % script.format_ms(RaceRecords.best_ms(key))
	else:
		_best_label.text = "Aún no has corrido esta combinación de circuito y cilindrada."


## Entrar no es obligatorio para jugar: sin cuenta se corre igual y los tiempos
## se guardan en el dispositivo. La cuenta es para que cuenten fuera.
func _open_account() -> void:
	if Session.is_logged_in():
		Session.logout()
		_refresh_account()
		return

	var screen: CanvasLayer = load("res://scenes/ui/login-screen.tscn").instantiate()
	screen.closed.connect(_refresh_account)
	add_child(screen)


func _refresh_account() -> void:
	if not is_instance_valid(_account_subtitle):
		return

	if Session.is_logged_in():
		_account_subtitle.text = ("Conectado como %s — tus tiempos se suben." % Session.email).to_upper()
		_account_button.text = "🚪 SALIR"
	else:
		_account_subtitle.text = "Juegas sin cuenta. Tus tiempos se guardan aquí; con cuenta salen además en la clasificación.".to_upper()
		_account_button.text = "🚪 ENTRAR"

	_sync_start_buttons()


## Pide el emparejamiento (TASK-284) y, si hay respuesta, deja que
## `RaceDirector` arranque la carrera con los rivales devueltos.
func _on_online_pressed() -> void:
	_online_button.disabled = true
	_online_button.text = "BUSCANDO RIVAL…"

	var response = await RacingApi.match_online_race(GameSettings.track_key())

	# El menú pudo cerrarse (o el modo cambiar) mientras esperábamos la
	# respuesta: sin esto, tocar un botón ya libre revienta el árbol.
	if not is_instance_valid(_online_button):
		return

	_online_button.disabled = not Session.is_logged_in()
	_online_button.text = "MULTIJUGADOR ONLINE"

	if not response.ok:
		push_warning("No se pudo emparejar: %s" % response.message)
		return

	var target: Variant = response.data.get("target")
	var threat: Variant = response.data.get("threat")
	play_online_pressed.emit(
		target if target is Dictionary else {},
		threat if threat is Dictionary else {})


## Abre el lobby de la carrera en vivo (TASK-323, tarea 6) — a diferencia de
## `_on_online_pressed()`, aquí no hay una única llamada HTTP que resuelva
## el rival: la pantalla se queda escuchando al `LiveRaceSocket` ella sola
## hasta que arranca de verdad o el jugador cancela.
func _on_live_pressed() -> void:
	add_child(load("res://scenes/ui/online-lobby-screen.tscn").instantiate())


# --- Piezas -------------------------------------------------------------------

## Encabezado de sección — nivel 2 de la jerarquía de `UiTheme`.
func _heading(text: String) -> Label:
	return UiTheme.heading_label(text, UiTheme.FONT_MD)


## Cabecera de columna dentro de una fila de "ajustes rápidos" (Sentido /
## Dificultad-Clase) — más pequeña que `_heading()`, para que dos quepan una
## junto a otra sin competir en tamaño con "Circuito"/"Configuración de carrera".
## Mismo nivel 2, solo que atenuada.
func _sub_heading(text: String) -> Label:
	return UiTheme.heading_label(text, UiTheme.FONT_XS, UiTheme.CARD_MUTED)


## Texto secundario — nivel 3: caja mixta y peso normal, porque son frases
## que se leen, no rótulos.
func _label(text: String) -> Label:
	var label := UiTheme.label_text(text, UiTheme.FONT_SM)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label


## Segmento de la chapa de accesos (Ajustes/Amigos/Clasificaciones/Cuenta).
## Antes era una `pill_button()` con su propio fondo, borde y sombra, o sea
## cuatro píldoras sueltas puestas en fila; ahora el fondo lo pone el bloque
## (`UiTheme.metal_block()`) y el segmento solo se ilumina al pasar por encima
## o pulsar.
func _icon_button(text: String, on_pressed: Callable) -> Button:
	# Subido de (160, 72) FONT_XS a (200, 96) FONT_SM: el ancho antiguo caía
	# por debajo del área táctil cómoda en móvil (referencia iOS/Android es
	# 44-48pt = ~88px con densidad 2x) y el texto quedaba muy pequeño para
	# leer de un vistazo.
	var button := _action_button(UiTheme.segment_button(text, Vector2(200, 96), UiTheme.FONT_SM))
	button.pressed.connect(on_pressed)
	return button


## Botón de modo de juego: icono de polígono bajo a la izquierda, nombre en
## caja alta a la derecha, sobre rectángulo redondeado gris claro con borde
## fino.
##
## El contenido va en una `HBoxContainer` HIJA del botón en vez de en su
## `text`/`icon` porque `Button.icon` pide una `Texture2D` y estos iconos se
## DIBUJAN (ver `mode_icon.gd`), no son imágenes. La caja se marca
## `MOUSE_FILTER_IGNORE` entera para que no se coma los clics: el que responde
## sigue siendo el botón de debajo.
func _mode_button(label: String, icon_kind: int) -> Button:
	# Alto subido de 88 a 108 y font_size de SM a MD: los modos son el toque
	# más frecuente del menú, más área táctil y letra más grande que se lee
	# de un vistazo en móvil.
	var button := UiTheme.pill_button(
		"", _OPTION_BG, UiTheme.CARD_INK, Vector2(0, 108), UiTheme.FONT_MD,
		UiTheme.GOOD, Color.WHITE)

	var row := HBoxContainer.new()
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.add_theme_constant_override("separation", 16)
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	for side in ["left", "right"]:
		row.add_theme_constant_override("margin_" + side, 20)
	button.add_child(row)

	var icon := ModeIcon.new()
	icon.kind = icon_kind
	icon.custom_minimum_size = Vector2(64, 64)
	icon.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(icon)

	var text := UiTheme.heading_label(label, UiTheme.FONT_MD, UiTheme.CARD_INK)
	text.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	text.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_child(text)

	return button


## Botón de ACCIÓN — nivel 2 de la jerarquía: caja alta y SemiBold. Los de
## OPCIÓN (circuito, Sentido, cilindrada) NO pasan por aquí: son nivel 3 y se
## quedan en caja mixta y peso normal, para no competir con las acciones.
##
## La caja alta se aplica aquí y no dentro de `pill_button()` porque el texto
## de algunos cambia en caliente (`_online_button` al buscar rival,
## `_account_button` al entrar o salir) y una transformación metida en la
## fábrica se perdería en la siguiente asignación, dejando el botón en caja
## mixta a mitad de sesión.
func _action_button(button: Button) -> Button:
	button.text = button.text.to_upper()
	UiTheme.emphasize(button)
	return button
