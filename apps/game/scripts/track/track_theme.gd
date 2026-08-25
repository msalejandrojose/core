class_name TrackTheme

## Ambientación de un circuito: paleta, cielo y luz.
##
## Los modelos de Kenney no tienen variante nevada. Lo que sí tienen es que
## todos sacan su color de la MISMA textura de paleta, unas franjas planas. Así
## que nevar el escenario entero es remapear los verdes de esa paleta a blanco:
## hierba, arbustos y copas de los árboles cambian a la vez, y el asfalto, los
## pianos y los troncos se quedan como están porque no son verdes.
##
## Es un cambio de textura, no de geometría: cero assets nuevos.

enum Kind {
	MEADOW,
	SNOW,
}

## Blanco apenas azulado. El azul marcado se lee como hielo.
const SNOW_TINT := Color(0.97, 0.98, 1.0)
## La luminancia del verde original se comprime a esta franja alta. Usarla tal
## cual dejaba los verdes en gris medio: parecía asfalto mojado, no nieve.
const SNOW_SHADE_MIN := 0.70
const SNOW_SHADE_RANGE := 0.30

## Construir una librería cuesta recorrer una textura de 512x512 y duplicar
## todas las mallas. Se hace una vez y se guarda: reiniciar una vuelta no puede
## pagar eso.
static var _libraries := {}
static var _environments := {}


static func mesh_library(base: MeshLibrary, kind: Kind) -> MeshLibrary:
	if kind == Kind.MEADOW:
		return base
	if not _libraries.has(kind):
		_libraries[kind] = _snow_library(base)
	return _libraries[kind]


static func environment(base: Environment, kind: Kind) -> Environment:
	if kind == Kind.MEADOW:
		return base
	if not _environments.has(kind):
		_environments[kind] = _snow_environment(base)
	return _environments[kind]


static func sun_color(kind: Kind) -> Color:
	# Luz fría y algo apagada: un sol cálido sobre nieve la vuelve arena.
	return Color(0.82, 0.88, 1.0) if kind == Kind.SNOW else Color(1, 1, 1)


# --- Nieve --------------------------------------------------------------------

static func _snow_library(base: MeshLibrary) -> MeshLibrary:
	var texture := _snow_texture(base)
	var library := MeshLibrary.new()

	for id in base.get_item_list():
		library.create_item(id)
		library.set_item_name(id, base.get_item_name(id))
		library.set_item_mesh_transform(id, base.get_item_mesh_transform(id))
		# Sin copiar las formas, el circuito nevado se quedaría sin colisiones y
		# el coche atravesaría las vallas.
		library.set_item_shapes(id, base.get_item_shapes(id))

		var mesh := base.get_item_mesh(id)
		if mesh == null:
			continue

		var copy := mesh.duplicate(true)
		if copy is ArrayMesh and texture != null:
			for surface in copy.get_surface_count():
				var material: Material = copy.surface_get_material(surface)
				if material is StandardMaterial3D:
					# Se duplica el material explícitamente en vez de confiar en
					# que `duplicate(true)` lo haya hecho: si los comparten,
					# teñir el nevado tiñe también los circuitos verdes.
					var snow: StandardMaterial3D = (material as StandardMaterial3D).duplicate()
					snow.albedo_texture = texture
					(copy as ArrayMesh).surface_set_material(surface, snow)
		library.set_item_mesh(id, copy)

	return library


static func _snow_texture(base: MeshLibrary) -> Texture2D:
	var source := _find_albedo(base)
	if source == null:
		return null

	var image := source.get_image()
	if image == null:
		return null
	if image.is_compressed():
		image.decompress()

	image = image.duplicate()
	image.convert(Image.FORMAT_RGBA8)
	# La textura importada trae mipmaps, así que `get_data` devuelve también sus
	# niveles y `create_from_data` con el tamaño base no cuadra: devolvía null
	# sin decir nada y el circuito salía verde.
	var had_mipmaps := image.has_mipmaps()
	image.clear_mipmaps()

	# Se opera sobre los bytes en crudo y no con get_pixel/set_pixel: son
	# 262.144 píxeles y por la vía cómoda esto tarda segundos.
	var data := image.get_data()
	for i in range(0, data.size(), 4):
		var r := data[i]
		var g := data[i + 1]
		var b := data[i + 2]

		# Verde = el canal verde manda con holgura. El margen evita teñir los
		# grises del asfalto, donde los tres canales van casi parejos.
		if g <= r + 10 or g <= b + 10:
			continue

		var shade := SNOW_SHADE_MIN + SNOW_SHADE_RANGE * (float(r + g + b) / 765.0)
		data[i] = int(SNOW_TINT.r * shade * 255.0)
		data[i + 1] = int(SNOW_TINT.g * shade * 255.0)
		data[i + 2] = int(SNOW_TINT.b * shade * 255.0)

	var snowed := Image.create_from_data(
		image.get_width(), image.get_height(), false, Image.FORMAT_RGBA8, data)
	if had_mipmaps:
		snowed.generate_mipmaps()
	return ImageTexture.create_from_image(snowed)


static func _find_albedo(base: MeshLibrary) -> Texture2D:
	for id in base.get_item_list():
		var mesh := base.get_item_mesh(id)
		if mesh == null:
			continue
		for surface in mesh.get_surface_count():
			var material: Material = mesh.surface_get_material(surface)
			if material is StandardMaterial3D:
				var standard := material as StandardMaterial3D
				if standard.albedo_texture != null:
					return standard.albedo_texture
	return null


static func _snow_environment(base: Environment) -> Environment:
	var env: Environment = base.duplicate(true)

	env.background_color = Color(0.80, 0.85, 0.92)
	env.ambient_light_color = Color(0.78, 0.84, 0.92)

	if env.sky != null and env.sky.sky_material is ProceduralSkyMaterial:
		var sky: ProceduralSkyMaterial = env.sky.sky_material
		sky.sky_top_color = Color(0.62, 0.70, 0.82)
		sky.sky_horizon_color = Color(0.86, 0.89, 0.93)

	# Niebla suave: separa el circuito del cielo, que si no quedan del mismo
	# blanco y el borde del escenario desaparece.
	env.fog_enabled = true
	env.fog_light_color = Color(0.86, 0.90, 0.95)
	env.fog_density = 0.0035

	return env
