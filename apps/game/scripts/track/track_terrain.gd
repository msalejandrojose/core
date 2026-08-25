class_name TrackTerrain

## Terreno de sección: manchas locales dentro de UN circuito (hielo, barro,
## agua...), distinto del tema visual del circuito ENTERO (`TrackTheme`,
## asfalto/nieve). Conviven: TASK-270 decidió que las secciones son manchas
## locales ENCIMA del tema, no lo sustituyen.
##
## Espejo exacto de `track-terrain.ts` en la API — mismos tipos, mismos
## números. Si cambian ahí, cambian aquí, igual que `validateTrackPath` se
## replica en el editor del backoffice.

enum Kind {
	ASPHALT,
	ICE,
	MUD,
	WATER,
}

class Effect:
	## Multiplicador de agarre. Mismo eje que `Track.grip` y `Vehicle.grip`.
	var grip: float
	## Si además de perder agarre, frena la velocidad punta mientras se pisa.
	var slows_top_speed: bool

	func _init(p_grip: float, p_slows_top_speed: bool) -> void:
		grip = p_grip
		slows_top_speed = p_slows_top_speed


static var _effects := {
	Kind.ASPHALT: Effect.new(1.0, false),
	Kind.ICE: Effect.new(0.4, false),
	Kind.MUD: Effect.new(0.6, true),
	Kind.WATER: Effect.new(0.75, false),
}


static func effect(kind: Kind) -> Effect:
	return _effects[kind]


## Traduce el código de tipo que manda la API (string) al enum local. Devuelve
## -1 si no lo reconoce — un tipo que este cliente aún no sabe pintar ni
## aplicar es mejor ignorarlo que reventar (TASK-304).
static func kind_from_code(code: String) -> int:
	match code:
		"ASPHALT": return Kind.ASPHALT
		"ICE": return Kind.ICE
		"MUD": return Kind.MUD
		"WATER": return Kind.WATER
		_: return -1
