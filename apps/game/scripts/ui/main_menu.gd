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
## Circuito ya no se elige en una pantalla aparte por defecto: los 4 del
## catálogo local salen en una rejilla 2×2 aquí mismo, con miniaturas de
## marcador de posición (un color liso por circuito) hasta que haya arte de
## verdad. "Más circuitos" sigue abriendo la pantalla completa
## (`TrackSelectScreen`) para los nacidos en el backoffice.
##
## Sentido (Normal/Inverso) se quita de aquí a propósito, sin sustituto en
## ningún otro sitio de la interfaz por ahora — `GameSettings.reverse` se
## queda con el último valor que tuviera. Es una pérdida de alcance
## deliberada, no un descuido.
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

const MODES := [
	[Mode.CARRERA_RAPIDA, "Carrera Rápida"],
	[Mode.GRAND_PRIX, "Grand Prix"],
	[Mode.TIME_TRIAL, "Time Trial"],
]

var _active_mode: int = Mode.CARRERA_RAPIDA
var _mode_buttons: Dictionary = {}  # Mode (int) -> Button

## Persistentes: viven en la cabecera/columnas fijas, no en contenido que se
## reconstruye — aquí ya no hay pestañas que limpiar y volver a montar.
var _account_subtitle: Label
var _account_button: Button
var _wallet_label: Label

var _track_summary_label: Label
var _track_cards: Array[PanelContainer] = []
var _track_card_ids: Array[String] = []
## Id de circuito local → `TextureRect` de su tarjeta rápida — mismo
## mecanismo que `track_select_screen.gd` para la imagen de portada subida
## en el backoffice.
var _cover_thumbnails: Dictionary = {}
var _engine_buttons: Array[Button] = []
var _best_label: Label
var _start_button: Button
var _online_button: Button


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
		margin.add_theme_constant_override("margin_" + side, 72)
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

	var title := Label.new()
	title.text = "Racing World"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_DISPLAY)
	title.add_theme_color_override("font_color", UiTheme.CLAY)
	title_column.add_child(title)

	_account_subtitle = Label.new()
	_account_subtitle.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	_account_subtitle.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.6))
	title_column.add_child(_account_subtitle)

	var push := Control.new()
	push.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(push)

	header.add_child(_build_wallet_badge())

	var bar := HBoxContainer.new()
	bar.add_theme_constant_override("separation", 4)
	header.add_child(bar)

	bar.add_child(_icon_button("⚙ Ajustes", func() -> void:
		add_child(load("res://scenes/ui/settings-screen.tscn").instantiate())))
	bar.add_child(_icon_button("👥 Amigos", func() -> void:
		add_child(load("res://scenes/ui/friends-screen.tscn").instantiate())))
	bar.add_child(_icon_button("🏆 Clasificaciones", func() -> void:
		add_child(load("res://scenes/ui/leaderboard-screen.tscn").instantiate())))

	_account_button = _icon_button("🚪 Salir", _open_account)
	bar.add_child(_account_button)

	return header


## "CREDITOS: N" de la referencia (TASK-320) — sin cuenta se queda a 0, las
## monedas viven en el servidor por jugador, igual que el resto de `Wallet`.
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
		var button := UiTheme.pill_button(
			entry[1], _OPTION_BG, UiTheme.CARD_INK, Vector2(0, 88), UiTheme.FONT_SM,
			UiTheme.GOOD, Color.WHITE)
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
	var workshop_button := UiTheme.pill_button(
		"🔧 Ir al taller", UiTheme.STEEL, Color.WHITE, Vector2(0, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_SM)
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
	var card := UiTheme.card_panel()
	card.custom_minimum_size = Vector2(460, 0)
	card.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var content := VBoxContainer.new()
	content.add_theme_constant_override("separation", 12)
	card.add_child(content)

	content.add_child(_heading("Configuración de carrera"))
	content.add_child(_heading("Circuito"))

	_track_summary_label = Label.new()
	_track_summary_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_track_summary_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	content.add_child(_track_summary_label)

	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	content.add_child(grid)

	var tracks := TrackCatalog.all()
	for i in tracks.size():
		var layout: TrackCatalog.Layout = tracks[i]
		var color: Color = _TRACK_PLACEHOLDER_COLORS[i % _TRACK_PLACEHOLDER_COLORS.size()]
		grid.add_child(_track_quick_card(layout.id, layout.name, color))

	var more_tracks := UiTheme.pill_button(
		"Más circuitos", _OPTION_BG, UiTheme.CARD_INK, Vector2(0, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_XS)
	more_tracks.pressed.connect(_open_track_select)
	content.add_child(more_tracks)

	content.add_child(_heading("Cilindrada"))

	var engines := HBoxContainer.new()
	engines.add_theme_constant_override("separation", 16)
	content.add_child(engines)

	var engine_group := ButtonGroup.new()
	for value in [GameSettings.EngineClass.CC50, GameSettings.EngineClass.CC100, GameSettings.EngineClass.CC150]:
		var button := UiTheme.pill_button(
			GameSettings.ENGINE_NAMES[value], _OPTION_BG, UiTheme.CARD_INK,
			UiTheme.BUTTON_MIN_SIZE, UiTheme.FONT_SM, UiTheme.GOOD, Color.WHITE)
		button.toggle_mode = true
		button.button_group = engine_group
		var chosen: int = value
		button.pressed.connect(func() -> void: _pick_engine(chosen))
		engines.add_child(button)
		_engine_buttons.append(button)

	_best_label = Label.new()
	_best_label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	_best_label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	content.add_child(_best_label)

	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	content.add_child(spacer)

	var buttons_row := HFlowContainer.new()
	buttons_row.add_theme_constant_override("h_separation", 16)
	buttons_row.add_theme_constant_override("v_separation", 16)
	content.add_child(buttons_row)

	_start_button = UiTheme.pill_button(
		"Empezar Carrera", UiTheme.GOOD, Color.WHITE, Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_LG)
	_start_button.pressed.connect(_start_race)
	buttons_row.add_child(_start_button)

	# Solo tiene sentido en Carrera Rápida: el emparejamiento compara contra
	# el leaderboard del circuito elegido, algo que Grand Prix y Time Trial
	# no usan (TASK-284).
	_online_button = UiTheme.pill_button(
		"Multijugador Online", UiTheme.BLUE, Color.WHITE, Vector2(320, UiTheme.BUTTON_MIN_SIZE.y), UiTheme.FONT_LG)
	_online_button.pressed.connect(_on_online_pressed)
	buttons_row.add_child(_online_button)

	return card


## Tarjeta de selección rápida de circuito: color liso de marcador de
## posición (sin miniatura de verdad todavía) + nombre. Tocar selecciona al
## momento — a diferencia de `TrackSelectScreen`, aquí no hay paso de
## "Confirmar", son solo los 4 del catálogo local sin circuitos del
## backoffice que cargar.
func _track_quick_card(id: String, label: String, color: Color) -> Control:
	var panel := PanelContainer.new()
	_track_cards.append(panel)
	_track_card_ids.append(id)

	var inner := VBoxContainer.new()
	inner.add_theme_constant_override("separation", 6)
	panel.add_child(inner)

	var holder := Control.new()
	holder.custom_minimum_size = Vector2(0, 64)
	inner.add_child(holder)

	var swatch := ColorRect.new()
	swatch.color = color
	swatch.set_anchors_preset(Control.PRESET_FULL_RECT)
	holder.add_child(swatch)

	# Encima del color liso: en cuanto `_load_track_covers()` encuentre la
	# variante de "portada" de este circuito con imagen subida en el
	# backoffice, la textura tapa el color (ver comentario en
	# `track_select_screen.gd`, mismo mecanismo).
	var thumbnail := TextureRect.new()
	thumbnail.set_anchors_preset(Control.PRESET_FULL_RECT)
	thumbnail.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	thumbnail.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
	thumbnail.clip_contents = true
	holder.add_child(thumbnail)
	_cover_thumbnails[id] = thumbnail

	var name_label := Label.new()
	name_label.text = label
	name_label.add_theme_font_size_override("font_size", UiTheme.FONT_XS)
	name_label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	inner.add_child(name_label)

	var button := Button.new()
	button.flat = true
	button.set_anchors_preset(Control.PRESET_FULL_RECT)
	button.pressed.connect(func() -> void: _pick_track(id))
	panel.add_child(button)

	return panel


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

		for id in _track_card_ids:
			if slug == _cover_slug(id) and _cover_thumbnails.has(id):
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


## "Empezar Carrera" hace una cosa distinta según el modo elegido a la
## izquierda — Grand Prix ya es una pantalla propia completa (selección de
## manga, intento en curso), así que aquí solo se abre; no se reconstruye
## dentro de esta pantalla.
func _start_race() -> void:
	match _active_mode:
		Mode.CARRERA_RAPIDA:
			play_pressed.emit()
		Mode.GRAND_PRIX:
			add_child(load("res://scenes/ui/grand-prix-screen.tscn").instantiate())
		Mode.TIME_TRIAL:
			time_trial_pressed.emit()


func _sync_start_buttons() -> void:
	if not is_instance_valid(_online_button):
		return
	_online_button.visible = _active_mode == Mode.CARRERA_RAPIDA
	if _active_mode == Mode.CARRERA_RAPIDA:
		_online_button.disabled = not Session.is_logged_in()


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

	for i in _track_cards.size():
		var matches := _track_card_ids[i] == GameSettings.track_id
		var style := UiTheme.card_stylebox_selected(UiTheme.CLAY, UiTheme.CARD, 14) if matches \
			else UiTheme.card_stylebox(UiTheme.CARD, 14)
		_track_cards[i].add_theme_stylebox_override("panel", style)

	for i in _engine_buttons.size():
		_engine_buttons[i].button_pressed = i == GameSettings.engine_class

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
		_account_subtitle.text = "Conectado como %s — tus tiempos se suben." % Session.email
		_account_button.text = "🚪 Salir"
	else:
		_account_subtitle.text = "Juegas sin cuenta. Tus tiempos se guardan aquí; con cuenta salen además en la clasificación."
		_account_button.text = "🚪 Entrar"

	_sync_start_buttons()


## Pide el emparejamiento (TASK-284) y, si hay respuesta, deja que
## `RaceDirector` arranque la carrera con los rivales devueltos.
func _on_online_pressed() -> void:
	_online_button.disabled = true
	_online_button.text = "Buscando rival…"

	var response = await RacingApi.match_online_race(GameSettings.track_key())

	# El menú pudo cerrarse (o el modo cambiar) mientras esperábamos la
	# respuesta: sin esto, tocar un botón ya libre revienta el árbol.
	if not is_instance_valid(_online_button):
		return

	_online_button.disabled = not Session.is_logged_in()
	_online_button.text = "Multijugador Online"

	if not response.ok:
		push_warning("No se pudo emparejar: %s" % response.message)
		return

	var target: Variant = response.data.get("target")
	var threat: Variant = response.data.get("threat")
	play_online_pressed.emit(
		target if target is Dictionary else {},
		threat if threat is Dictionary else {})


# --- Piezas -------------------------------------------------------------------

func _heading(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", UiTheme.FONT_MD)
	label.add_theme_color_override("font_color", UiTheme.CARD_INK)
	return label


func _label(text: String) -> Label:
	var label := Label.new()
	label.text = text
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	label.add_theme_color_override("font_color", UiTheme.CARD_MUTED)
	return label


## Botón de cabecera (Ajustes/Amigos/Clasificaciones/Cuenta): píldora
## metálica oscura sobre el fondo atenuado, el mismo lenguaje que la barra
## superior del boceto.
func _icon_button(text: String, on_pressed: Callable) -> Button:
	var button := UiTheme.pill_button(text, UiTheme.STEEL, Color.WHITE, Vector2(160, 72), UiTheme.FONT_XS)
	button.pressed.connect(on_pressed)
	return button
