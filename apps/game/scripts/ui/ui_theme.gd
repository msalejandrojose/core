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
