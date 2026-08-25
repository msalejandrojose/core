extends Node

## Caché local de circuitos descargados de la API (TASK-245): construir uno
## que no está en el catálogo estático (`TrackCatalog`) — típicamente uno
## nacido en el backoffice, o una manga de Grand Prix — y poder seguir
## jugándolo sin red la próxima vez.
##
## Autoload registrado como `TrackCache` en project.godot.
##
## El catálogo estático sigue siendo la fuente de los 4 circuitos originales;
## esto es solo para lo que NO está ahí.

const PATH := "user://track_cache.cfg"

var _cache: Dictionary = {}  # slug (String) -> Dictionary tal cual la devuelve la API


func _ready() -> void:
	_load()


## Layout de `slug`: de caché si ya está, si no lo pide a la API y lo guarda
## para la próxima vez. Null si no está en caché y la petición falla — sin
## red, o el circuito no existe o no está activo.
func get_or_fetch(slug: String) -> TrackCatalog.Layout:
	if _cache.has(slug):
		return _to_layout(_cache[slug])

	var response = await RacingApi.track(slug)
	if not response.ok or not (response.data is Dictionary):
		return null

	_cache[slug] = response.data
	_save()
	return _to_layout(response.data)


func has_cached(slug: String) -> bool:
	return _cache.has(slug)


func clear() -> void:
	_cache = {}
	_save()


static func _to_layout(data: Dictionary) -> TrackCatalog.Layout:
	var cells: Array[Vector2i] = []
	var terrain: Dictionary = {}

	for raw in data.get("path", []):
		var cell := Vector2i(int(raw.get("x", 0)), int(raw.get("y", 0)))
		cells.append(cell)
		if raw.has("terrain"):
			var kind := TrackTerrain.kind_from_code(str(raw["terrain"]))
			if kind != -1:
				terrain[cell] = kind

	var theme := (
		TrackTheme.Kind.SNOW if str(data.get("theme", "MEADOW")) == "SNOW"
		else TrackTheme.Kind.MEADOW)
	# Sectores = checkpoints intermedios + la meta (`Track.sectorCount` en la
	# API); `Layout` guarda solo los intermedios.
	var checkpoints: int = maxi(int(data.get("sectorCount", 4)) - 1, 1)

	return TrackCatalog.Layout.new(
		str(data.get("slug", "")),
		str(data.get("name", "")),
		cells,
		checkpoints,
		theme,
		float(data.get("grip", 1.0)),
		terrain,
	)


# --- Persistencia -------------------------------------------------------------

func _load() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PATH) != OK:
		return
	var stored: Variant = cfg.get_value("cache", "tracks", {})
	_cache = stored if stored is Dictionary else {}


func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("cache", "tracks", _cache)
	cfg.save(PATH)
