class_name RaceDirector extends Node

## Pega el cronómetro, el coche y las marcas guardadas. El HUD solo escucha.

signal restarted()
signal record_beaten(duration_ms: int)
## `has_reference` es false mientras no haya récord contra el que comparar:
## el HUD debe mostrar el sector sin delta en vez de un "+0.000" mentiroso.
signal sector_delta(checkpoint: int, delta_ms: int, has_reference: bool)
## Luces encendidas de `LIGHT_COUNT`. Al llegar a todas, sale el GO.
signal countdown_changed(lights_on: int, total: int)
signal countdown_finished()

const LIGHT_COUNT := 3
## Intervalo entre luces. La cuenta dura un intervalo más que luces hay: las
## tres se encienden y la salida es el paso siguiente, así que la tercera llega
## a verse encendida. Total 2,4 s.
##
## Corto a propósito: en un contrarreloj se reinicia constantemente, y una
## salida larga se convierte en peaje en cuanto llevas veinte intentos.
const LIGHT_INTERVAL_S := 0.6
## Margen para que la comparación de floats no se coma el último paso cuando el
## delta acumulado se queda en 1,79999 en vez de 1,8.
const _EPSILON := 0.0001

## Altura por debajo de la cual se da el coche por perdido y se le devuelve a la
## salida.
##
## Es una red de seguridad, no un arreglo: no se ha conseguido reproducir que el
## coche acabe fuera del mundo (20 cambios de circuito conduciendo, ninguno
## falló), pero un jugador que se cae al vacío se queda sin partida hasta que
## reinicia a mano, y eso no puede pasar por muy raro que sea el camino que
## lleve allí.
const RESCUE_BELOW_Y := -5.0

## Modelo 3D por arquetipo. Los tres son camiones del starter kit de Kenney
## recoloreados (mismo rig, cero geometría nueva) — solo la moto tiene una
## forma de verdad distinta, y esa vive en su propia escena aparte.
const ARCHETYPE_MODELS := {
	"normal": "res://models/vehicle-truck-yellow.glb",
	"f1": "res://models/vehicle-truck-red.glb",
	"4x4": "res://models/vehicle-truck-green.glb",
}

## Solo para los tests: fuerza la clave de récord y deja fuera al catálogo,
## para que un arnés no escriba en la marca real de un circuito del juego.
@export var track_id_override: String = ""
@export var vehicle_path: NodePath = ^"../Vehicle"
@export var lap_timer_path: NodePath = ^"../LapTimer"
@export var track_builder_path: NodePath = ^"../TrackBuilder"
@export var view_path: NodePath = ^"../View"
@export var main_menu_path: NodePath = ^"../MainMenu"
@export var race_hud_path: NodePath = ^"../RaceHud"
@export var touch_controls_path: NodePath = ^"../TouchControls"

var vehicle: Vehicle
var lap_timer: LapTimer
var track_builder: TrackBuilder
var view: Node3D
var main_menu: CanvasLayer
var race_hud: CanvasLayer
var touch_controls: CanvasLayer

var counting_down: bool = false
var _countdown_elapsed: float = 0.0
var _lights_on: int = 0

## Circuito activo. Se guarda para poder reaplicar el coche (`CarLoadout`
## puede cambiar, p.ej. al iniciar sesión, sin que cambie el circuito) sin
## repetir `TrackCatalog.by_id`.
var _layout: TrackCatalog.Layout


func _ready() -> void:
	vehicle = get_node(vehicle_path)
	lap_timer = get_node(lap_timer_path)
	track_builder = get_node(track_builder_path)
	view = get_node(view_path)
	main_menu = get_node(main_menu_path)
	race_hud = get_node(race_hud_path)
	touch_controls = get_node(touch_controls_path)

	main_menu.play_pressed.connect(_on_play_pressed)

	lap_timer.sector_completed.connect(_on_sector_completed)
	lap_timer.lap_completed.connect(_on_lap_completed)

	# Con semáforo, arrancar el crono es decisión del director. Dejar además el
	# arranque por acelerón haría que el crono empezara antes que la carrera.
	lap_timer.auto_start_on_throttle = false

	GameSettings.changed.connect(_on_settings_changed)
	# El equipamiento puede llegar después (login asíncrono, o el jugador
	# entra a mitad de partida): cuando cambie, se reaplica sin reconstruir
	# el circuito entero.
	CarLoadout.changed.connect(_apply_car_loadout)

	# Se pone una sola vez: el terreno bajo el coche (TASK-273) lo lee
	# `Vehicle` cada frame directamente del `TrackBuilder`, sin pasar por el
	# director — es el mismo nodo durante toda la partida, cambie o no de
	# circuito.
	vehicle.track_builder = track_builder

	rebuild_track()
	restart()

	# Se arranca en el menú: el juego no empieza a contar sin que nadie haya
	# dicho a qué circuito quiere jugar.
	open_menu()


func _process(delta: float) -> void:
	if vehicle.global_position.y < RESCUE_BELOW_Y:
		push_warning("Coche fuera del mundo en %s, devuelto a la salida." % record_key())
		restart()
		return

	if not counting_down:
		return

	_countdown_elapsed += delta

	var lights := clampi(int(_countdown_elapsed / LIGHT_INTERVAL_S + _EPSILON), 0, LIGHT_COUNT)
	if lights != _lights_on:
		_lights_on = lights
		countdown_changed.emit(_lights_on, LIGHT_COUNT)

	if _countdown_elapsed + _EPSILON >= countdown_duration():
		_release()


## Salida parada con semáforo. Todas las vueltas empiezan igual, que es lo que
## hace que los tiempos de un contrarreloj se puedan comparar entre sí.
func begin_countdown() -> void:
	counting_down = true
	_countdown_elapsed = 0.0
	_lights_on = 0
	VehicleInput.locked = true
	lap_timer.abort()
	countdown_changed.emit(0, LIGHT_COUNT)


func countdown_duration() -> float:
	return (LIGHT_COUNT + 1) * LIGHT_INTERVAL_S


func _release() -> void:
	counting_down = false
	_countdown_elapsed = 0.0
	VehicleInput.locked = false
	lap_timer.start()
	countdown_finished.emit()


func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_R:
		restart()
		get_viewport().set_input_as_handled()


## Clave bajo la que se guarda el récord: circuito y sentido.
func record_key() -> String:
	if track_id_override.is_empty():
		return GameSettings.track_key()
	return GameSettings.key_for(track_id_override)


## Levanta el circuito seleccionado y engancha el cronómetro a sus puertas.
## Solo hace falta al arrancar y al cambiarlo en ajustes; reiniciar una vuelta
## no reconstruye nada, que por eso es instantáneo.
func rebuild_track() -> void:
	_layout = TrackCatalog.by_id(GameSettings.track_id)
	track_builder.build(_layout)
	lap_timer.rescan()
	_apply_car_loadout()


## Pone en `Vehicle` la parte del coche que NO cambia frame a frame: el coche
## equipado (arquetipo + piezas) combinado con el circuito (grip de tema, y si
## el tema entero ya cuenta como offroad). El agarre EFECTIVO final —
## cruzando esto con el terreno de sección bajo el coche ahora mismo — lo
## termina de calcular `Vehicle._update_terrain` cada frame, con la misma
## fórmula que `effectiveGrip` en la API (`car-stats.ts`).
func _apply_car_loadout() -> void:
	vehicle.base_grip = CarLoadout.grip * _layout.grip
	vehicle.base_speed_scale = CarLoadout.speed_scale * GameSettings.engine_speed()
	vehicle.theme_is_offroad = _layout.theme == TrackTheme.Kind.SNOW
	vehicle.offroad_grip_modifier = CarLoadout.offroad_grip_modifier
	vehicle.set_body(_body_scene_for(CarLoadout.archetype_code))


func _body_scene_for(archetype_code: String) -> PackedScene:
	var path: String = ARCHETYPE_MODELS.get(archetype_code, ARCHETYPE_MODELS[CarLoadout.DEFAULT_ARCHETYPE_CODE])
	return load(path)


## Reinicio rápido. No recarga la escena ni reconstruye la pista: recoloca el
## coche y reinicia el estado. Es el gesto más usado de un contrarreloj, así
## que tiene que ser instantáneo — una pantalla de carga aquí mataría el bucle.
func restart() -> void:
	# La salida es la línea de meta. En sentido inverso, mirando al otro lado:
	# el circuito es el mismo, se recorre al revés.
	vehicle.position = track_builder.start_position
	vehicle.reset_to_start(track_builder.start_yaw + (PI if GameSettings.reverse else 0.0))
	lap_timer.set_reversed(GameSettings.reverse)
	view.snap()
	VehicleInput.release()
	begin_countdown()
	restarted.emit()


## Con un menú delante la salida se congela: la cuenta atrás no puede correr
## detrás de una pantalla, y el coche no puede salir sin que lo estén viendo.
func open_menu() -> void:
	set_process(false)
	VehicleInput.locked = true
	# También los controles: los pedales se dibujan siempre, y sin esconderlos
	# quedan flotando encima del menú y compitiendo con sus botones.
	race_hud.visible = false
	touch_controls.visible = false
	main_menu.open()


func _on_play_pressed() -> void:
	main_menu.close()
	race_hud.visible = true
	touch_controls.visible = true
	restart()
	set_process(true)


func _on_settings_changed() -> void:
	rebuild_track()
	restart()
	# Cambiar de circuito desde el menú no debe soltar el coche: se reconstruye
	# la pista para verla de fondo, pero la salida sigue congelada.
	#
	# Y NO se abre el menú aquí: cambiar el esquema de control desde Ajustes en
	# mitad de una carrera te echaría a la pantalla de inicio.
	if main_menu.visible:
		set_process(false)
		VehicleInput.locked = true


func _on_sector_completed(sector: int, split_ms: int) -> void:
	var reference := RaceRecords.best_splits(record_key())
	if sector >= reference.size():
		sector_delta.emit(sector, 0, false)
		return

	sector_delta.emit(sector, split_ms - int(reference[sector]), true)


func _on_lap_completed(duration_ms: int, splits_ms: Array) -> void:
	if RaceRecords.submit(record_key(), duration_ms, splits_ms):
		record_beaten.emit(duration_ms)

	# La marca local se guarda SIEMPRE, haya cuenta o no y haya red o no. Subirla
	# es un extra: el juego no puede quedarse esperando a un servidor justo
	# después de cruzar la meta, así que se encola y ya se ocupa la cola.
	if Session.is_logged_in():
		LapQueue.enqueue(record_key(), duration_ms, splits_ms)
