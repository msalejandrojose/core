extends Node

## Saldo de monedas del jugador (TASK-286/318/320).
##
## Autoload registrado como `Wallet` en project.godot.
##
## Sin cuenta, o mientras no ha llegado la respuesta de la API, el saldo se
## queda a 0 — jugar sin cuenta ya no sube monedas de verdad (viven en el
## servidor por jugador, igual que `CarLoadout`), así que no hay nada que
## fingir aquí.

signal changed()

var balance: int = 0


func _ready() -> void:
	Session.changed.connect(refresh)
	refresh()


## Se llama al arrancar y cada vez que cambia la sesión (login/logout).
func refresh() -> void:
	if not Session.is_logged_in():
		balance = 0
		changed.emit()
		return

	var response = await RacingApi.wallet()
	if not response.ok or not (response.data is Dictionary):
		# Un fallo de red no puede romper la pantalla: se queda con el
		# último saldo conocido (o 0, si es la primera carga).
		push_warning("No se pudo cargar el saldo de monedas, se mantiene el actual.")
		return

	balance = int(response.data.get("balance", 0))
	changed.emit()
