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


static func _pill(color: Color) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = color
	box.set_corner_radius_all(999)
	return box
