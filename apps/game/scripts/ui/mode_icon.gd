extends Control

## Icono de modo de juego, dibujado con polígonos planos y contorno oscuro —
## el mismo lenguaje de polígono bajo que los modelos del garaje.
##
## Se dibuja en vez de ser una imagen porque en `models/`/`assets` no hay arte
## 2D ninguno: cualquier icono sería un PNG nuevo que alguien tendría que
## producir. Dibujado se escala sin pixelarse y sigue la paleta de `UiTheme`
## si algún día cambia.
##
## Las coordenadas van en tanto por uno del lado del control y se escalan en
## `_draw()`, así que el mismo icono vale a cualquier tamaño con solo mover
## `custom_minimum_size`.

enum Kind {
	## Bandera de cuadros: carrera suelta.
	FLAG,
	## Copa: Grand Prix, que es el campeonato.
	TROPHY,
	## Cronómetro: contrarreloj.
	STOPWATCH,
}

const _OUTLINE := Color("2b2822")
const _OUTLINE_WIDTH := 2.0

@export var kind: Kind = Kind.FLAG:
	set(value):
		kind = value
		queue_redraw()


func _draw() -> void:
	var s := minf(size.x, size.y)
	var origin := (size - Vector2(s, s)) * 0.5
	match kind:
		Kind.FLAG:
			_draw_flag(origin, s)
		Kind.TROPHY:
			_draw_trophy(origin, s)
		Kind.STOPWATCH:
			_draw_stopwatch(origin, s)


func _draw_flag(origin: Vector2, s: float) -> void:
	# Mástil.
	_poly(origin, s, [
		Vector2(0.16, 0.08), Vector2(0.24, 0.08),
		Vector2(0.24, 0.94), Vector2(0.16, 0.94),
	], Color("5b5148"))

	# Paño, en damero 3×2: cada casilla es su propio cuadrilátero, alternando
	# blanco y negro como una bandera de meta de verdad.
	var left := 0.24
	var top := 0.12
	var cell := 0.20
	for row in 3:
		for col in 3:
			var dark := (row + col) % 2 == 0
			var x := left + col * cell
			var y := top + row * cell
			_poly(origin, s, [
				Vector2(x, y), Vector2(x + cell, y),
				Vector2(x + cell, y + cell), Vector2(x, y + cell),
			], Color("2b2822") if dark else Color("f4f1ea"), false)

	# Un solo contorno alrededor del paño entero, en vez de uno por casilla:
	# con 9 contornos el icono se emborronaba a tamaño pequeño.
	_outline(origin, s, [
		Vector2(left, top), Vector2(left + 3 * cell, top),
		Vector2(left + 3 * cell, top + 3 * cell), Vector2(left, top + 3 * cell),
	])


func _draw_trophy(origin: Vector2, s: float) -> void:
	# Asas.
	for side: float in [-1.0, 1.0]:
		var mid: float = 0.5 + side * 0.30
		_poly(origin, s, [
			Vector2(0.5 + side * 0.20, 0.16), Vector2(mid, 0.22),
			Vector2(mid, 0.42), Vector2(0.5 + side * 0.20, 0.40),
		], Color("d9a441"))

	# Copa.
	_poly(origin, s, [
		Vector2(0.24, 0.14), Vector2(0.76, 0.14),
		Vector2(0.66, 0.56), Vector2(0.34, 0.56),
	], Color("f0c14b"))

	# Pie.
	_poly(origin, s, [
		Vector2(0.44, 0.56), Vector2(0.56, 0.56),
		Vector2(0.56, 0.74), Vector2(0.44, 0.74),
	], Color("d9a441"))
	_poly(origin, s, [
		Vector2(0.30, 0.74), Vector2(0.70, 0.74),
		Vector2(0.74, 0.88), Vector2(0.26, 0.88),
	], Color("c08b2e"))


func _draw_stopwatch(origin: Vector2, s: float) -> void:
	# Corona y pulsador.
	_poly(origin, s, [
		Vector2(0.42, 0.06), Vector2(0.58, 0.06),
		Vector2(0.58, 0.16), Vector2(0.42, 0.16),
	], Color("5b5148"))

	# Caja, como octógono: un círculo de verdad desentonaría con el resto de
	# la interfaz, que es todo caras planas.
	var body := PackedVector2Array()
	for i in 8:
		var angle := TAU * (float(i) / 8.0) - PI / 8.0
		body.append(Vector2(0.5, 0.56) + Vector2(cos(angle), sin(angle)) * 0.40)
	_poly(origin, s, body, Color("6b98bf"))

	# Esfera.
	var face := PackedVector2Array()
	for i in 8:
		var angle := TAU * (float(i) / 8.0) - PI / 8.0
		face.append(Vector2(0.5, 0.56) + Vector2(cos(angle), sin(angle)) * 0.28)
	_poly(origin, s, face, Color("f4f1ea"), false)

	# Aguja.
	_poly(origin, s, [
		Vector2(0.48, 0.56), Vector2(0.52, 0.56),
		Vector2(0.60, 0.36), Vector2(0.55, 0.34),
	], Color("c0453a"))


func _poly(
	origin: Vector2, s: float, points: Array, color: Color, outlined: bool = true
) -> void:
	var scaled := PackedVector2Array()
	for point in points:
		scaled.append(origin + Vector2(point) * s)
	draw_colored_polygon(scaled, color)
	if outlined:
		draw_polyline(scaled + PackedVector2Array([scaled[0]]), _OUTLINE, _OUTLINE_WIDTH)


func _outline(origin: Vector2, s: float, points: Array) -> void:
	var scaled := PackedVector2Array()
	for point in points:
		scaled.append(origin + Vector2(point) * s)
	draw_polyline(scaled + PackedVector2Array([scaled[0]]), _OUTLINE, _OUTLINE_WIDTH)
