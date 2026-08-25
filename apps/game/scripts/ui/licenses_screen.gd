extends CanvasLayer

## Pantalla de licencias de terceros.
##
## El texto va EMBEBIDO como constante, no leído de `res://LICENSES.md`. Godot
## no mete en el .pck los ficheros que no son recursos salvo que se añadan a
## mano a los filtros de export, y aquí el fallo silencioso sería distribuir la
## app sin el aviso MIT — que es la única obligación real que tenemos sobre el
## código de Kenney.
##
## `LICENSES.md` sigue siendo la fuente para el repo, y `tests/licenses_test.gd`
## comprueba que ambos no se han separado.

const LICENSE_TEXT := """CÓDIGO — Starter Kit Racing

MIT License

Copyright (c) 2023 Kenney

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


ASSETS — modelos 3D, sprites y audio

Los modelos, sprites y efectos de sonido incluidos son de Kenney y están bajo
CC0 1.0 Universal (dominio público). No requieren atribución ni imponen
restricción alguna. Se mencionan por cortesía, no por obligación.


MOTOR — Godot Engine

Godot Engine está bajo licencia MIT.
Copyright (c) 2014-presente Juan Linietsky, Ariel Manzur y contribuidores de
Godot Engine."""

signal closed()


func _ready() -> void:
	layer = 10
	_build()


func _build() -> void:
	var backdrop := ColorRect.new()
	# Casi opaco: con el juego translúcido detrás, un texto legal a cuerpo
	# pequeño se lee mal justo donde más importa que se lea.
	backdrop.color = UiTheme.ink_alpha(0.985)
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(backdrop)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 72)
	add_child(margin)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 24)
	margin.add_child(column)

	var title := Label.new()
	title.text = "Licencias"
	title.add_theme_font_size_override("font_size", UiTheme.FONT_XL)
	title.add_theme_color_override("font_color", UiTheme.BONE)
	column.add_child(title)

	# El texto tiene que poder leerse entero: en horizontal en un móvil no cabe
	# ni de lejos, así que va en un scroll, no en una caja fija recortada.
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	# Sin scroll horizontal el hijo se ve forzado al ancho del contenedor, que es
	# lo que hace que el autowrap del texto sirva de algo.
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	column.add_child(scroll)

	var body := Label.new()
	body.text = LICENSE_TEXT
	body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_theme_font_size_override("font_size", UiTheme.FONT_SM)
	body.add_theme_color_override("font_color", UiTheme.BONE * Color(1, 1, 1, 0.85))
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(body)

	var close := UiTheme.make_button("Cerrar")
	close.size_flags_horizontal = Control.SIZE_SHRINK_END
	close.pressed.connect(close_screen)
	column.add_child(close)


func close_screen() -> void:
	closed.emit()
	queue_free()
