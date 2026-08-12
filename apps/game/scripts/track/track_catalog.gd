class_name TrackCatalog

## Los circuitos, definidos como una lista de celdas en orden de recorrido.
##
## De esa lista se deriva todo lo demás: qué pieza va en cada celda y con qué
## rotación, dónde caen los checkpoints, y en qué punto y orientación sale el
## coche. Añadir un circuito es añadir coordenadas, no montar una escena.
##
## Reglas del trazado:
##   - Bucle cerrado: la última celda tiene que ser vecina de la primera.
##   - Solo movimientos ortogonales de una celda (nada de diagonales ni saltos).
##   - Sin repetir celda: un cruce no se puede representar con estas piezas.
##   - La celda 0 es la meta y tiene que ser recta, es decir, la anterior y la
##     siguiente van en la misma dirección. Si la meta cayera en una curva, la
##     salida quedaría atravesada.
##
## `tests/track_catalog_test.gd` comprueba estas cuatro reglas en los tres.


class Layout:
	var id: String
	var name: String
	var path: Array[Vector2i]
	var checkpoints: int

	func _init(p_id: String, p_name: String, p_path: Array[Vector2i], p_checkpoints: int = 3) -> void:
		id = p_id
		name = p_name
		path = p_path
		checkpoints = p_checkpoints


const DEFAULT_ID := "kenney-01"


static func all() -> Array:
	return [_kenney(), _herradura(), _chicane()]


static func by_id(id: String) -> Layout:
	for layout in all():
		if layout.id == id:
			return layout
	return all()[0]


static func ids() -> Array:
	var out: Array = []
	for layout in all():
		out.append(layout.id)
	return out


# --- Trazados -----------------------------------------------------------------

## El circuito original del starter kit de Kenney, transcrito celda a celda
## decodificando el GridMap que traía la escena.
static func _kenney() -> Layout:
	var path: Array[Vector2i] = [
		Vector2i(0, 0), Vector2i(0, 1), Vector2i(0, 2),
		Vector2i(-1, 2), Vector2i(-2, 2),
		Vector2i(-2, 1), Vector2i(-2, 0), Vector2i(-2, -1),
		Vector2i(-3, -1), Vector2i(-3, -2), Vector2i(-3, -3),
		Vector2i(-2, -3), Vector2i(-1, -3), Vector2i(0, -3),
		Vector2i(0, -2), Vector2i(0, -1),
	]
	return Layout.new("kenney-01", "Kenney", path)


## Más largo y más rápido: rectas largas y una entrada hacia dentro que rompe
## el óvalo, para que no sea gas a fondo todo el rato.
static func _herradura() -> Layout:
	var path: Array[Vector2i] = [
		Vector2i(0, 0), Vector2i(0, 1), Vector2i(0, 2), Vector2i(0, 3), Vector2i(0, 4),
		Vector2i(-1, 4), Vector2i(-2, 4),
		Vector2i(-2, 3), Vector2i(-2, 2),
		Vector2i(-3, 2), Vector2i(-4, 2),
		Vector2i(-4, 1), Vector2i(-4, 0), Vector2i(-4, -1),
		Vector2i(-3, -1), Vector2i(-2, -1), Vector2i(-1, -1), Vector2i(0, -1),
	]
	return Layout.new("herradura", "Herradura", path)


## Corto y técnico: una ese seguida, donde se gana o se pierde por frenar bien.
static func _chicane() -> Layout:
	var path: Array[Vector2i] = [
		Vector2i(0, 0), Vector2i(0, 1), Vector2i(0, 2),
		Vector2i(-1, 2), Vector2i(-1, 3),
		Vector2i(-2, 3), Vector2i(-2, 2),
		Vector2i(-3, 2), Vector2i(-3, 1), Vector2i(-3, 0), Vector2i(-3, -1),
		Vector2i(-2, -1), Vector2i(-1, -1), Vector2i(0, -1),
	]
	return Layout.new("chicane", "Chicane", path)
