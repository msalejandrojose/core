extends Node

## Preferencias del jugador, guardadas en el dispositivo.
##
## Autoload registrado como `GameSettings` en project.godot.

const PATH := "user://settings.cfg"

enum ControlScheme {
	## Volante flotante analógico con acelerador y freno. El de TASK-197.
	WHEEL,
	## Se pulsa un lado u otro de la pantalla para girar y el gas va puesto.
	TAP,
}

signal changed()

var control_scheme: ControlScheme = ControlScheme.WHEEL
var reverse: bool = false

var _cfg := ConfigFile.new()


func _ready() -> void:
	_cfg.load(PATH)
	control_scheme = _cfg.get_value("controls", "scheme", ControlScheme.WHEEL)
	reverse = _cfg.get_value("track", "reverse", false)


func set_control_scheme(scheme: ControlScheme) -> void:
	if scheme == control_scheme:
		return
	control_scheme = scheme
	_cfg.set_value("controls", "scheme", scheme)
	_save()


func set_reverse(value: bool) -> void:
	if value == reverse:
		return
	reverse = value
	_cfg.set_value("track", "reverse", value)
	_save()


## Sufijo para las claves de récord. Correr al revés es, a efectos de tiempos,
## otro circuito: una vuelta inversa no se puede comparar con una normal, así
## que cada sentido guarda su propia marca. En la API esto será una `Track`
## distinta o un campo `direction`.
func track_suffix() -> String:
	return "-rev" if reverse else ""


func _save() -> void:
	_cfg.save(PATH)
	changed.emit()
