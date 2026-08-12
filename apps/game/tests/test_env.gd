extends Node

## Preconditions comunes de los arneses.
##
## `GameSettings` es un autoload que persiste en `user://settings.cfg`, o sea
## que un test hereda lo que el jugador (o el test anterior) dejó puesto. Ya
## pasó: unas capturas dejaron el esquema en TAP y los arneses de input y de
## circuito empezaron a fallar sin que nadie hubiera tocado su código.
##
## Todo test que cargue `main.tscn` llama a esto antes de nada.
##
## ⚠️ Correr la suite deja tus preferencias en los valores por defecto.

static func reset() -> void:
	GameSettings.set_control_scheme(GameSettings.ControlScheme.WHEEL)
	GameSettings.set_reverse(false)
	VehicleInput.locked = false
	VehicleInput.touch_active = false
	VehicleInput.steer = 0.0
	VehicleInput.throttle = 0.0
