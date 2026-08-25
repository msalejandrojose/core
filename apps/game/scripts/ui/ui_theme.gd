class_name UiTheme

## Paleta, tipografía y botones del cliente Godot, en un solo sitio.
##
## Antes de esto cada pantalla (login, menú, taller, ajustes, HUD, licencias,
## controles táctiles) redeclaraba sus propias constantes BONE/INK/CLAY/BAD/
## GOOD y usaba tamaños de fuente sueltos sin ningún criterio compartido
## (llegaron a convivir 8 tamaños distintos). El look en sí no cambia — se
## mantiene el mismo estilo minimalista de paneles oscuros semitransparentes
## con texto crema que ya tenía la app — solo se centraliza y los botones
## pasan a tener un tamaño táctil más cómodo.

# --- Paleta ---------------------------------------------------------------

const BONE := Color("f0ece6")
const INK := Color(0.11, 0.098, 0.09)
const CLAY := Color("b4552f")
const BAD := Color("c4544a")
const GOOD := Color("4c9a68")

# --- Paleta clara, tipo tarjeta (TASK: pase de diseño en Taller/Menú/
# Selección de circuito) --------------------------------------------------
#
# Aparte de la paleta oscura de arriba, que sigue siendo la de siempre para
# el resto de pantallas (login, ajustes, HUD, licencias, amigos, Grand
# Prix) — cambiarla habría desentonado esas pantallas sin ningún beneficio.
# Estas tres imitan tarjetas claras flotando sobre la escena 3D, a partir de
# una captura de referencia, con paneles/botones nuevos y ADITIVOS: nada de
# lo de arriba se toca ni se reutiliza para esto.

const CARD := Color("faf8f4")
const CARD_INK := Color("2b2822")
const CARD_MUTED := Color(0.169, 0.157, 0.133, 0.6)
const STEEL := Color("3d4450")
const BLUE := Color("3f7cc4")

const CARD_CORNER_RADIUS := 20
const PILL_FONT_SIZE := FONT_SM

# --- Tipografía -------------------------------------------------------------
# Escala única que sustituye a los 24/26/28/30/32/40/52/72 sueltos de antes.

const FONT_XS := 24
const FONT_SM := 28
const FONT_MD := 32
const FONT_LG := 40
const FONT_XL := 52
const FONT_DISPLAY := 72

# --- Botones ----------------------------------------------------------------
# Antes medían entre 80 y 100px de alto según la pantalla; se sube a un
# tamaño cómodo de tocar y se deja fijo para todos.

const BUTTON_MIN_SIZE := Vector2(240, 112)
const BUTTON_FONT_SIZE := FONT_MD


## Devuelve INK con una transparencia concreta, para fondos de panel/backdrop
## (el mismo uso que antes hacía cada pantalla a mano con Color(INK.r, ...)).
static func ink_alpha(alpha: float) -> Color:
	return Color(INK.r, INK.g, INK.b, alpha)


## Botón con el estilo de la app ya montado: fondo INK translúcido que se
## aclara en hover, se tiñe de CLAY al pulsar/seleccionar (toggle_mode
## incluido, vía el estado "pressed") y se apaga en disabled.
static func make_button(
	text: String,
	min_size: Vector2 = BUTTON_MIN_SIZE,
	font_size: int = BUTTON_FONT_SIZE,
) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = min_size
	button.add_theme_font_size_override("font_size", font_size)
	button.add_theme_color_override("font_color", BONE)
	button.add_theme_color_override("font_hover_color", BONE)
	button.add_theme_color_override("font_pressed_color", BONE)
	button.add_theme_color_override("font_disabled_color", BONE * Color(1, 1, 1, 0.4))
	button.add_theme_stylebox_override("normal", _panel(INK, 0.55))
	button.add_theme_stylebox_override("hover", _panel(INK, 0.75))
	button.add_theme_stylebox_override("pressed", _panel(CLAY, 0.65))
	button.add_theme_stylebox_override("focus", _panel(INK, 0.55))
	button.add_theme_stylebox_override("disabled", _panel(INK, 0.3))
	return button


static func _panel(color: Color, alpha: float) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = Color(color.r, color.g, color.b, alpha)
	box.set_corner_radius_all(10)
	return box


# --- Tarjetas claras --------------------------------------------------------

## Panel redondeado con sombra, tipo tarjeta flotando sobre la escena 3D. Sin
## `border`: el contraste contra el fondo ya lo da la sombra, un borde encima
## se veía recargado.
static func card_stylebox(bg: Color = CARD, radius: int = CARD_CORNER_RADIUS) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = bg
	box.set_corner_radius_all(radius)
	box.shadow_color = Color(0, 0, 0, 0.22)
	box.shadow_size = 14
	box.shadow_offset = Vector2(0, 6)
	return box


## Igual que `card_stylebox()` pero con un borde de color — para marcar la
## tarjeta elegida (circuito confirmado, variante resaltada) sin depender de
## una imagen o icono que no existe.
static func card_stylebox_selected(border: Color = CLAY, bg: Color = CARD, radius: int = CARD_CORNER_RADIUS) -> StyleBoxFlat:
	var box := card_stylebox(bg, radius)
	box.border_color = border
	box.set_border_width_all(4)
	return box


## Contenedor con `card_stylebox()` de fondo, listo para meter contenido
## dentro con su propio margen — evita repetir el `PanelContainer` + margen a
## mano en cada pantalla.
static func card_panel(bg: Color = CARD, radius: int = CARD_CORNER_RADIUS, margin: int = 24) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", card_stylebox(bg, radius))
	for side in ["left", "right", "top", "bottom"]:
		panel.add_theme_constant_override("margin_" + side, margin)
	return panel


## Botón "píldora" de fondo sólido y esquinas totalmente redondeadas — el
## acento de color (verde para la acción principal, azul para la secundaria,
## gris para neutra) que llevan los botones del boceto, en vez del panel
## oscuro translúcido de `make_button()`.
## `pressed_bg`: color del estado pulsado/seleccionado (toggle_mode incluido).
## Por defecto es `bg` oscurecido — pero para una lista de opciones (modos,
## variantes, circuitos) interesa que lo elegido cambie de color de verdad
## (p.ej. gris neutro → verde), no solo un tono más oscuro del mismo gris.
static func pill_button(
	text: String,
	bg: Color = GOOD,
	fg: Color = Color.WHITE,
	min_size: Vector2 = BUTTON_MIN_SIZE,
	font_size: int = PILL_FONT_SIZE,
	pressed_bg: Variant = null,
	pressed_fg: Variant = null,
) -> Button:
	var button := Button.new()
	var resolved_pressed_bg: Color = pressed_bg if pressed_bg is Color else bg.darkened(0.15)
	var resolved_pressed_fg: Color = pressed_fg if pressed_fg is Color else fg
	button.text = text
	button.custom_minimum_size = min_size
	button.add_theme_font_size_override("font_size", font_size)
	button.add_theme_color_override("font_color", fg)
	button.add_theme_color_override("font_hover_color", fg)
	button.add_theme_color_override("font_pressed_color", resolved_pressed_fg)
	button.add_theme_color_override("font_disabled_color", fg * Color(1, 1, 1, 0.6))
	button.add_theme_stylebox_override("normal", _pill(bg))
	button.add_theme_stylebox_override("hover", _pill(bg.lightened(0.1)))
	button.add_theme_stylebox_override("pressed", _pill(resolved_pressed_bg))
	button.add_theme_stylebox_override("focus", _pill(bg))
	button.add_theme_stylebox_override("disabled", _pill(Color(bg.r, bg.g, bg.b, 0.35)))
	return button


## Iteración 1 sobre el estilo de botón del boceto (pedido explícito: "los
## botones son muy feos y no son claros") — antes era una cápsula sin borde
## ni sombra (radio 999, mismo color que el fondo de la tarjeta en los
## botones neutros, casi sin contraste). Ahora esquinas moderadas + borde
## oscuro + sombra sutil, como el resto de la interfaz "tarjeta" ya usa en
## `card_stylebox()` — un botón se tiene que leer como botón aunque su color
## de fondo case con el de la tarjeta de detrás.
# --- Jerarquía tipográfica ---------------------------------------------------
#
# Tres niveles, por PAPEL del texto y no por el widget que lo pinta:
#
#   1. Título y marcadores — caja alta, Bold, relleno blanco y contorno negro.
#      El marcador (créditos, estado de cuenta) es el mismo lenguaje con el
#      cuerpo y el filo mucho más pequeños.
#   2. Encabezados de sección y botones de acción — caja alta, SemiBold, color
#      sólido, SIN contorno.
#   3. Etiquetas y texto secundario — caja MIXTA, peso normal, más pequeño,
#      para que no compitan con lo de arriba.
#
# Ojo con el nivel: es por papel, así que "Normal"/"Inverso" o los nombres de
# circuito ("Kenney", "Herradura") son nivel 3 aunque vayan dentro de un
# botón — son opciones, no acciones.
#
# Palo seco sale gratis: el proyecto no trae ninguna fuente propia (no hay
# `.ttf`/`.otf` ni tema con fuente), así que se usa la de Godot por defecto,
# que ya es sans-serif.
#
# Los pesos, en cambio, hay que SINTETIZARLOS con `FontVariation`
# (`variation_embolden`) por lo mismo: sin ficheros de fuente no hay variantes
# Bold/SemiBold que cargar. Si algún día se añade una familia de verdad con
# sus grosores, esto se cambia por sus ficheros — el engorde sintético reparte
# el grosor por igual y no respeta el dibujo original de la letra.

const WEIGHT_REGULAR := 0.0
const WEIGHT_SEMIBOLD := 0.35
const WEIGHT_BOLD := 0.65


static func weighted_font(weight: float) -> FontVariation:
	var font := FontVariation.new()
	font.base_font = ThemeDB.fallback_font
	font.variation_embolden = weight
	return font


## Nivel 1 — TÍTULO. La caja alta la fuerza esta función, no quien llama, para
## que ningún título se escape de la regla.
static func title_label(text: String, font_size: int = FONT_DISPLAY) -> Label:
	var label := Label.new()
	label.text = text.to_upper()
	label.add_theme_font_override("font", weighted_font(WEIGHT_BOLD))
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", Color.WHITE)
	label.add_theme_color_override("font_outline_color", Color.BLACK)
	label.add_theme_constant_override("outline_size", _outline_for(font_size))
	return label


## Nivel 1b — MARCADOR (créditos, estado de cuenta): el mismo lenguaje que el
## título pero en pequeño, y con el filo proporcionalmente más fino todavía
## —de ahí el `_outline_for()` compartido, que lo ata al cuerpo— porque un
## contorno grueso sobre letra pequeña se come el hueco interior y la vuelve
## ilegible.
static func marker_label(text: String, font_size: int = FONT_XS) -> Label:
	return title_label(text, font_size)


## Nivel 2 — ENCABEZADO DE SECCIÓN: caja alta, SemiBold, sólido, sin contorno.
static func heading_label(
	text: String, font_size: int = FONT_MD, color: Color = CARD_INK
) -> Label:
	var label := Label.new()
	label.text = text.to_upper()
	label.add_theme_font_override("font", weighted_font(WEIGHT_SEMIBOLD))
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	return label


## Nivel 3 — ETIQUETA / texto secundario: caja mixta y peso normal, tal cual
## se le pase.
static func label_text(
	text: String, font_size: int = FONT_SM, color: Color = CARD_MUTED
) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	return label


## Sube un botón ya construido al nivel 2 (SemiBold). Va aparte y no como otro
## parámetro de `pill_button()`, que ya tiene siete; y aparte también porque
## NO todos los botones son nivel 2: los de opción se quedan en regular.
static func emphasize(control: Control) -> void:
	control.add_theme_font_override("font", weighted_font(WEIGHT_SEMIBOLD))


## El contorno va en un constant, no en el stylebox, y se dibuja hacia fuera.
## Atado al cuerpo para que se mantenga fino a cualquier tamaño.
static func _outline_for(font_size: int) -> int:
	return maxi(2, font_size / 9)


## Bloque metálico de UNA pieza para agrupar accesos (la barra superior del
## menú). A diferencia de `card_stylebox()`, oscuro y con el borde superior
## más claro que el fondo y el inferior más grueso: ese reflejo arriba y el
## canto abajo es lo que lo lee como una chapa y no como una tarjeta.
## `bg` permite la misma pieza en claro (el contador de monedas) además de en
## acero. El borde se deriva del fondo en vez de ser fijo: sobre acero hay que
## ACLARARLO para que lea como reflejo, pero sobre blanco aclarar no se ve
## nada y hay que oscurecerlo. De ahí el reparto por luminancia.
static func metal_block(bg: Color = STEEL) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = bg
	box.set_corner_radius_all(14)
	box.border_color = bg.darkened(0.22) if bg.get_luminance() > 0.5 else bg.lightened(0.28)
	box.set_border_width_all(2)
	box.border_width_bottom = 5
	box.shadow_color = Color(0, 0, 0, 0.3)
	box.shadow_size = 9
	box.shadow_offset = Vector2(0, 4)
	return box


## Botón metálico SUELTO — la misma chapa que `metal_block()`, pero siendo él
## la pieza entera en vez de un segmento dentro de otra. Para los botones de
## navegación que van solos, como el "Atrás" al pie de una pantalla.
static func metal_button(
	text: String,
	bg: Color = STEEL,
	min_size: Vector2 = BUTTON_MIN_SIZE,
	font_size: int = PILL_FONT_SIZE,
) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = min_size
	button.add_theme_font_size_override("font_size", font_size)
	var ink: Color = CARD_INK if bg.get_luminance() > 0.5 else Color.WHITE
	for state in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		button.add_theme_color_override(state, ink)
	button.add_theme_stylebox_override("normal", metal_block(bg))
	button.add_theme_stylebox_override("hover", metal_block(bg.lightened(0.12)))
	button.add_theme_stylebox_override("pressed", metal_block(bg.darkened(0.12)))
	button.add_theme_stylebox_override("focus", metal_block(bg))
	button.add_theme_stylebox_override("disabled", metal_block(bg.darkened(0.3)))
	return button


## Velo que DESENFOCA lo que hay detrás (la escena 3D del garaje) en vez de
## taparlo con un color plano. Lo que se veía antes con `ink_alpha()` era el
## garaje entero nítido y apagado; así el garaje sigue estando pero deja de
## competir con el contenido de la pantalla.
##
## El desenfoque se saca leyendo la textura de pantalla en un nivel de mipmap
## alto (`textureLod`) en vez de con un desenfoque gaussiano de verdad: es un
## único muestreo por píxel en lugar de decenas, y a este tamaño de velo la
## diferencia no se aprecia. `amount` son niveles de mipmap, no píxeles.
static func blurred_backdrop(amount: float = 2.5, tint: Color = Color(0.11, 0.098, 0.09, 0.4)) -> ColorRect:
	var shader := Shader.new()
	shader.code = """
shader_type canvas_item;

uniform sampler2D screen_tex : hint_screen_texture, filter_linear_mipmap;
uniform float amount = 2.5;
uniform vec4 tint : source_color = vec4(0.0, 0.0, 0.0, 0.4);

void fragment() {
	vec3 blurred = textureLod(screen_tex, SCREEN_UV, amount).rgb;
	COLOR = vec4(mix(blurred, tint.rgb, tint.a), 1.0);
}
"""
	var material := ShaderMaterial.new()
	material.shader = shader
	material.set_shader_parameter("amount", amount)
	material.set_shader_parameter("tint", tint)

	var veil := ColorRect.new()
	veil.material = material
	veil.set_anchors_preset(Control.PRESET_FULL_RECT)
	return veil


## Botón que hace de SEGMENTO dentro de `metal_block()`. Sin fondo propio en
## reposo —se ve el del bloque— para que el grupo se lea como una sola pieza
## con zonas pulsables, en vez de como varias píldoras pegadas: es la
## diferencia entre "una chapa con botones" y "botones sueltos".
static func segment_button(
	text: String,
	min_size: Vector2 = Vector2(160, 72),
	font_size: int = FONT_XS,
) -> Button:
	var button := Button.new()
	button.text = text
	button.custom_minimum_size = min_size
	button.add_theme_font_size_override("font_size", font_size)
	for state in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		button.add_theme_color_override(state, Color.WHITE)
	button.add_theme_stylebox_override("normal", _segment(Color(1, 1, 1, 0)))
	button.add_theme_stylebox_override("hover", _segment(Color(1, 1, 1, 0.15)))
	button.add_theme_stylebox_override("pressed", _segment(Color(0, 0, 0, 0.25)))
	button.add_theme_stylebox_override("focus", _segment(Color(1, 1, 1, 0)))
	button.add_theme_stylebox_override("disabled", _segment(Color(0, 0, 0, 0.12)))
	return button


static func _segment(color: Color) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = color
	box.set_corner_radius_all(9)
	box.content_margin_left = 14
	box.content_margin_right = 14
	return box


static func _pill(color: Color) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = color
	box.set_corner_radius_all(16)
	box.border_color = CARD_INK
	box.set_border_width_all(3)
	box.shadow_color = Color(0, 0, 0, 0.2)
	box.shadow_size = 6
	box.shadow_offset = Vector2(0, 3)
	return box
