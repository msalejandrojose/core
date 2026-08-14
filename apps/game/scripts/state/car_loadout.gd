extends Node

## Arquetipo y piezas equipadas del jugador, ya combinados en los números que
## gobiernan la física (ver `computeCarStats` en la API — esta es la copia
## que consume el cliente, no la fuente de verdad).
##
## Autoload registrado como `CarLoadout` en project.godot.
##
## Sin cuenta, o mientras no ha llegado la respuesta de la API, se usan los
## valores del arquetipo "normal" (1.0/1.0/1.0): el coche siempre puede
## correr, aunque no haya red o el jugador no tenga sesión.

signal changed()

const DEFAULT_ARCHETYPE_CODE := "normal"

var archetype_code: String = DEFAULT_ARCHETYPE_CODE
## Arquetipo + piezas ya sumados (igual que `computeCarStats` en la API).
var speed_scale: float = 1.0
var grip: float = 1.0
## Multiplica el grip efectivo cuando la superficie no es asfalto seco. Es
## puramente del arquetipo: las piezas no lo tocan (ver `car-stats.ts`).
var offroad_grip_modifier: float = 1.0


func _ready() -> void:
	Session.changed.connect(refresh)
	refresh()


## Se llama al arrancar y cada vez que cambia la sesión (login/logout): el
## equipamiento es por cuenta, así que entrar o salir cambia qué coche toca.
func refresh() -> void:
	if not Session.is_logged_in():
		_apply_defaults()
		return

	var response = await RacingApi.car_loadout()
	if not response.ok or not (response.data is Dictionary):
		# Un fallo de red no puede dejar al jugador sin coche: se queda con lo
		# último que tuviera (o el default, si es la primera carga).
		push_warning("No se pudo cargar el coche del jugador, se mantiene el actual.")
		return

	var archetype: Variant = response.data.get("archetype")
	var stats: Variant = response.data.get("stats")
	if not (archetype is Dictionary) or not (stats is Dictionary):
		return

	archetype_code = str(archetype.get("code", DEFAULT_ARCHETYPE_CODE))
	offroad_grip_modifier = float(archetype.get("offroadGripModifier", 1.0))
	speed_scale = float(stats.get("speedScale", 1.0))
	grip = float(stats.get("grip", 1.0))
	changed.emit()


func _apply_defaults() -> void:
	archetype_code = DEFAULT_ARCHETYPE_CODE
	speed_scale = 1.0
	grip = 1.0
	offroad_grip_modifier = 1.0
	changed.emit()
