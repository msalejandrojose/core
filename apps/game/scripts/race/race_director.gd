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
## Una manga de Grand Prix ha cruzado meta (TASK-250). No se toca el
## leaderboard normal ni `RaceRecords`: quien orquesta el Grand Prix decide
## qué pasa con el tiempo.
signal grand_prix_stage_completed(duration_ms: int)
## Se ha vuelto al menú estando en Grand Prix, terminado o abandonado a
## mitad. Igual de seguro en los dos casos: el servidor conserva el intento
## en curso si queda a medias (TASK-247, se reanuda la próxima vez), y quien
## esté escuchando (la pantalla de Grand Prix) sabe que tiene que cerrarse.
signal grand_prix_ended()
## Vuelta normal (no Grand Prix) cruzada, con lo que hace falta para el
## resumen de resultado (TASK-260): el tiempo, la mejor marca ANTERIOR (null
## si no había ninguna) y si esta vuelta la ha batido. No se emite con
## `track_id_override` puesto: eso marca una carrera de arnés de test, no una
## partida real con interfaz delante.
signal lap_finished(duration_ms: int, previous_best_ms: Variant, is_new_record: bool)

## Contrarreloj de 3 vueltas (TASK-312): modo nuevo y separado del
## contrarreloj de una vuelta — mismo principio que Grand Prix, circuito
## propio y resultado propio, sin tocar el leaderboard/fantasma/carrera
## online de vuelta suelta.
signal time_trial_started()
## `lap_number` es la vuelta que se ACABA de completar (1, 2), no la que
## empieza — la última (`TIME_TRIAL_LAPS`) llega por `time_trial_finished`,
## no por esta señal.
signal time_trial_lap_completed(lap_number: int, duration_ms: int, total_ms: int)
signal time_trial_finished(total_ms: int, lap_times_ms: Array)

## Cada cuánto se toma una instantánea del fantasma, en ms — snapshots a
## ~20 Hz (TASK-219, decisión de formato de grabación).
const GHOST_SNAPSHOT_INTERVAL_MS := 50

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

## Vueltas de una carrera de contrarreloj (TASK-312).
const TIME_TRIAL_LAPS := 3

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

## Vacío = modo normal. Con Grand Prix en curso (TASK-250), `_on_lap_completed`
## no toca `RaceRecords`/`LapQueue` (esa manga no compite en el leaderboard
## normal, es una clasificación aparte) y `_on_settings_changed` no reconstruye
## desde `TrackCatalog` — el layout activo es el de la manga, no el del menú.
var _grand_prix_id: String = ""
var _grand_prix_reverse: bool = false

## Vacío/0 = no hay contrarreloj de 3 vueltas en curso. `_time_trial_lap` son
## las vueltas YA completadas (0..TIME_TRIAL_LAPS); `_time_trial_times` sus
## duraciones, en el mismo orden. El circuito/sentido/cilindrada son los que
## ya hubiera elegidos en el menú — el modo no tiene su propia selección.
var _time_trial_active: bool = false
var _time_trial_lap: int = 0
var _time_trial_times: Array = []

## Fantasma de la vuelta récord del circuito activo (TASK-220). Nace vacío
## (sin fantasma) y se rellena en cuanto hay una marca que reproducir.
var _ghost: Ghost
## Grabación de la vuelta EN CURSO. Se consume y se vacía en
## `_on_lap_completed`: `LapTimer.cross_finish()` encadena la vuelta
## siguiente en el mismo instante, así que para cuando llega la señal ya
## está corriendo otra.
var _ghost_recording: Array = []
var _ghost_last_snapshot_ms: int = -1

## Rivales de la carrera online en curso (TASK-282/284/285). Vacío = no hay
## carrera online activa, es una vuelta normal. Cada uno, si está presente,
## es `{"userId": String, "durationMs": int}` — lo que hace falta para
## anunciar el resultado, sus trayectorias ya viven en `_ghost_target`/
## `_ghost_threat`.
var _online_target: Dictionary = {}
var _online_threat: Dictionary = {}
## Objetivo (ligeramente mejor, verde) y amenaza (ligeramente peor, roja):
## colores distintos para que se distingan a simple vista en pista.
var _ghost_target: Ghost
var _ghost_threat: Ghost
const TARGET_COLOR := Color(0.35, 1.0, 0.45, 0.45)
const THREAT_COLOR := Color(1.0, 0.35, 0.3, 0.45)


func _ready() -> void:
	vehicle = get_node(vehicle_path)
	lap_timer = get_node(lap_timer_path)
	track_builder = get_node(track_builder_path)
	view = get_node(view_path)
	main_menu = get_node(main_menu_path)
	race_hud = get_node(race_hud_path)
	touch_controls = get_node(touch_controls_path)

	# Sin `@export`: quien abre la pantalla de Grand Prix se instancia fuera
	# de este árbol y necesita encontrar al director sin conocer su ruta.
	add_to_group("race_director")

	# Hijo de este director y no del padre: durante `_ready()` el padre
	# (`Main`) puede seguir montando sus propios hijos, y `add_child` en un
	# nodo ocupado falla. `Node3D` no necesita un padre `Node3D` inmediato
	# para que su transform global sea correcto — Godot ya salta los `Node`
	# intermedios al buscar el ancestro 3D más cercano.
	_ghost = Ghost.new()
	add_child(_ghost)
	_ghost_target = Ghost.new(TARGET_COLOR)
	add_child(_ghost_target)
	_ghost_threat = Ghost.new(THREAT_COLOR)
	add_child(_ghost_threat)

	main_menu.play_pressed.connect(_on_play_pressed)
	main_menu.play_online_pressed.connect(start_online_race)
	main_menu.time_trial_pressed.connect(start_time_trial)

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

	await rebuild_track()
	restart()

	# Se arranca en el menú: el juego no empieza a contar sin que nadie haya
	# dicho a qué circuito quiere jugar.
	open_menu()


func _process(delta: float) -> void:
	if vehicle.get_vehicle_position().y < RESCUE_BELOW_Y:
		push_warning("Coche fuera del mundo en %s, devuelto a la salida." % record_key())
		restart()
		return

	_ghost.update_at(lap_timer.elapsed_ms)
	_ghost_target.update_at(lap_timer.elapsed_ms)
	_ghost_threat.update_at(lap_timer.elapsed_ms)
	if lap_timer.running and not in_grand_prix() and not in_time_trial():
		_record_ghost_snapshot()

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
	_ghost_recording = []
	_ghost_last_snapshot_ms = -1
	lap_timer.start()
	countdown_finished.emit()


## Una instantánea cada `GHOST_SNAPSHOT_INTERVAL_MS`, no cada frame: a 60 fps
## eso sería 60 puntos por segundo para interpolar entre 20, todo gasto sin
## beneficio.
func _record_ghost_snapshot() -> void:
	var elapsed := lap_timer.elapsed_ms
	if elapsed - _ghost_last_snapshot_ms < GHOST_SNAPSHOT_INTERVAL_MS:
		return
	_ghost_last_snapshot_ms = elapsed
	_ghost_recording.append({
		"t": elapsed,
		"pos": vehicle.get_vehicle_position(),
		"yaw": vehicle.get_vehicle_yaw(),
	})


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
##
## Async porque `GameSettings.track_id` puede ser el slug de un circuito del
## servidor (creado en el backoffice) que no está en el catálogo local — para
## esos hace falta pedirlo a la API (vía `TrackCache`, con su propia caché en
## disco). Para los 4 del catálogo el `await` no llega a suspender nada: es
## instantáneo igual que antes.
func rebuild_track() -> void:
	_layout = await _resolve_layout(GameSettings.track_id)
	track_builder.build(_layout)
	lap_timer.rescan()
	_apply_car_loadout()


func _resolve_layout(id: String) -> TrackCatalog.Layout:
	if TrackCatalog.ids().has(id):
		return TrackCatalog.by_id(id)

	var layout: Variant = await TrackCache.get_or_fetch(id)
	# Sin red y sin caché previa, o el circuito ya no existe/no está activo:
	# no puede dejar al jugador sin pista donde pisar.
	return layout if layout != null else TrackCatalog.by_id(TrackCatalog.DEFAULT_ID)


## Arranca una manga de Grand Prix (TASK-250): construye el layout dado — que
## puede venir de `TrackCache`, no del catálogo local — en vez del circuito
## elegido en el menú. `reversed` es propio de la manga (viene del slug del
## servidor), no toca la preferencia guardada del jugador.
func start_grand_prix_stage(
	grand_prix_id: String,
	layout: TrackCatalog.Layout,
	reversed: bool,
) -> void:
	_grand_prix_id = grand_prix_id
	_grand_prix_reverse = reversed
	_layout = layout
	track_builder.build(_layout)
	lap_timer.rescan()
	_apply_car_loadout()

	main_menu.close()
	race_hud.visible = true
	touch_controls.visible = true
	restart()
	set_process(true)


func in_grand_prix() -> bool:
	return _grand_prix_id != ""


## Arranca un contrarreloj de 3 vueltas (TASK-312) en el circuito YA elegido
## en el menú — a diferencia de Grand Prix, este modo no tiene su propio
## circuito, así que reutiliza `_on_play_pressed` entero (cierra el menú,
## enseña el HUD, `restart()`, arranca `_process`).
func start_time_trial() -> void:
	_time_trial_active = true
	_time_trial_lap = 0
	_time_trial_times = []
	time_trial_started.emit()
	_on_play_pressed()


func in_time_trial() -> bool:
	return _time_trial_active


func _effective_reverse() -> bool:
	return _grand_prix_reverse if in_grand_prix() else GameSettings.reverse


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
	# En Grand Prix no hay fantasma: el récord del circuito del menú no
	# tiene nada que ver con la manga que se está corriendo.
	_ghost.set_snapshots([] if in_grand_prix() else RaceRecords.best_ghost(record_key()))


func _body_scene_for(archetype_code: String) -> PackedScene:
	var path: String = ARCHETYPE_MODELS.get(archetype_code, ARCHETYPE_MODELS[CarLoadout.DEFAULT_ARCHETYPE_CODE])
	return load(path)


## Reinicio rápido. No recarga la escena ni reconstruye la pista: recoloca el
## coche y reinicia el estado. Es el gesto más usado de un contrarreloj, así
## que tiene que ser instantáneo — una pantalla de carga aquí mataría el bucle.
func restart() -> void:
	# La salida es la línea de meta. En sentido inverso, mirando al otro lado:
	# el circuito es el mismo, se recorre al revés.
	var reversed := _effective_reverse()
	vehicle.position = track_builder.start_position
	vehicle.reset_to_start(track_builder.start_yaw + (PI if reversed else 0.0))
	lap_timer.set_reversed(reversed)
	view.snap()
	VehicleInput.release()
	begin_countdown()
	restarted.emit()


## Con un menú delante la salida se congela: la cuenta atrás no puede correr
## detrás de una pantalla, y el coche no puede salir sin que lo estén viendo.
func open_menu() -> void:
	# Volver al menú a mitad de un Grand Prix es abandonarlo: el intento se
	# queda IN_PROGRESS en el servidor (TASK-247, se puede reanudar), y aquí
	# solo hace falta soltar el layout de la manga y avisar a quien esté
	# escuchando (la pantalla de Grand Prix, para que se cierre sola).
	if in_grand_prix():
		_grand_prix_id = ""
		_grand_prix_reverse = false
		await rebuild_track()
		grand_prix_ended.emit()

	# Igual que Grand Prix pero sin layout propio que deshacer: el contrarreloj
	# corre en el circuito ya elegido en el menú, así que basta con soltar el
	# estado del intento — no hay nada que reconstruir.
	if in_time_trial():
		_time_trial_active = false
		_time_trial_lap = 0
		_time_trial_times = []

	# Volver al menú es también abandonar la carrera online en curso, si había
	# una: el jugador puede elegir otro circuito o pedir otro emparejamiento,
	# y arrastrar rivales de una combinación distinta no tendría sentido.
	_clear_online_race()

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


## Arranca una carrera online (TASK-282/284/285): el circuito ya elegido en
## el menú, con hasta dos fantasmas rivales corriendo a la vez. `target`/
## `threat` son lo que devuelve `RacingApi.match_online_race()` — cada uno
## vacío si ese rival no existe (báteta a ti mismo sin objetivo, o sin
## amenaza si nadie va peor).
func start_online_race(target: Dictionary, threat: Dictionary) -> void:
	_online_target = _rival_summary(target)
	_online_threat = _rival_summary(threat)
	_ghost_target.set_snapshots(_to_native_snapshots(target.get("snapshots", [])))
	_ghost_threat.set_snapshots(_to_native_snapshots(threat.get("snapshots", [])))
	_on_play_pressed()


## Solo lo que hace falta para anunciar el resultado — la trayectoria ya
## vive en el `Ghost`, no hace falta arrastrarla también aquí.
func _rival_summary(rival: Dictionary) -> Dictionary:
	if rival.is_empty():
		return {}
	return {"userId": rival["userId"], "durationMs": rival["durationMs"]}


## Convierte instantáneas de formato de red (`pos` como `{x,y,z}`, TASK-284)
## al formato nativo que consume `Ghost` (`pos` como `Vector3`).
func _to_native_snapshots(net_snapshots: Array) -> Array:
	var native: Array = []
	for snapshot in net_snapshots:
		var pos: Dictionary = snapshot["pos"]
		native.append({
			"t": int(snapshot["t"]),
			"pos": Vector3(pos["x"], pos["y"], pos["z"]),
			"yaw": float(snapshot["yaw"]),
		})
	return native


func _clear_online_race() -> void:
	_online_target = {}
	_online_threat = {}
	_ghost_target.set_snapshots([])
	_ghost_threat.set_snapshots([])


func _on_settings_changed() -> void:
	# En Grand Prix el layout activo es el de la manga, no el del menú: no se
	# reconstruye desde `TrackCatalog` (ver comentario de `_grand_prix_id`).
	if not in_grand_prix():
		await rebuild_track()
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
	# Sin referencia con la que comparar: el récord del circuito elegido en el
	# menú no tiene nada que ver con la manga de Grand Prix que se está
	# corriendo, ni con el intento de contrarreloj de 3 vueltas.
	if in_grand_prix() or in_time_trial():
		sector_delta.emit(sector, 0, false)
		return

	var reference := RaceRecords.best_splits(record_key())
	if sector >= reference.size():
		sector_delta.emit(sector, 0, false)
		return

	sector_delta.emit(sector, split_ms - int(reference[sector]), true)


func _on_lap_completed(duration_ms: int, splits_ms: Array) -> void:
	if in_grand_prix():
		grand_prix_stage_completed.emit(duration_ms)
		return

	if in_time_trial():
		# `LapTimer.cross_finish()` ya encadena la vuelta siguiente en el
		# mismo instante del cruce (antes de emitir esta señal): no hace
		# falta llamar a `restart()` entre vuelta y vuelta, conducir seguido
		# ya es lo que pasa por defecto.
		_time_trial_lap += 1
		_time_trial_times.append(duration_ms)

		if _time_trial_lap < TIME_TRIAL_LAPS:
			var total_so_far: int = 0
			for lap_ms in _time_trial_times:
				total_so_far += lap_ms
			time_trial_lap_completed.emit(_time_trial_lap, duration_ms, total_so_far)
			return

		_time_trial_active = false
		# `cross_finish()` ya encadenó una vuelta 4ª que nadie pidió (es lo
		# mismo que hace tras CUALQUIER vuelta, incluida la última). Sin
		# pararla aquí, si el coche sigue rodando y vuelve a cruzar la meta
		# ese tiempo caería por la rama normal de más abajo — justo lo que
		# el modo tiene prohibido tocar.
		lap_timer.abort()
		var total: int = 0
		for lap_ms in _time_trial_times:
			total += lap_ms
		time_trial_finished.emit(total, _time_trial_times)
		return

	# Se consume y se vacía ya: `LapTimer` encadena la vuelta siguiente antes
	# de emitir esta señal, así que `_ghost_recording` ya está acumulando la
	# de después.
	var this_lap_recording := _ghost_recording
	_ghost_recording = []
	_ghost_last_snapshot_ms = -1

	var key := record_key()
	var previous_best_ms: Variant = RaceRecords.best_ms(key) if RaceRecords.has_best(key) else null
	var is_new_record := RaceRecords.submit(key, duration_ms, splits_ms, this_lap_recording)
	if is_new_record:
		record_beaten.emit(duration_ms)
		_ghost.set_snapshots(this_lap_recording)

	# La marca local se guarda SIEMPRE, haya cuenta o no y haya red o no. Subirla
	# es un extra: el juego no puede quedarse esperando a un servidor justo
	# después de cruzar la meta, así que se encola y ya se ocupa la cola.
	if Session.is_logged_in():
		var ghost_snapshots_net: Array = []
		if is_new_record:
			for snapshot in this_lap_recording:
				var pos: Vector3 = snapshot["pos"]
				ghost_snapshots_net.append({
					"t": snapshot["t"],
					"pos": {"x": pos.x, "y": pos.y, "z": pos.z},
					"yaw": snapshot["yaw"],
				})
		LapQueue.enqueue(key, duration_ms, splits_ms, ghost_snapshots_net)

	# Una carrera online se registra aparte del tiempo de vuelta normal (que
	# ya se acaba de guardar arriba, tenga rivales o no): es el paquete
	# completo con el podio de esta tanda concreta (TASK-283), no solo el
	# tiempo suelto. Sin cola de reintento a propósito: si falla, se pierde
	# ese resultado histórico, pero el tiempo de vuelta del jugador ya está a
	# salvo por el camino de siempre.
	if not _online_target.is_empty() or not _online_threat.is_empty():
		var rivals: Array = []
		if not _online_target.is_empty():
			rivals.append({
				"role": "TARGET",
				"userId": _online_target["userId"],
				"durationMs": _online_target["durationMs"],
			})
		if not _online_threat.is_empty():
			rivals.append({
				"role": "THREAT",
				"userId": _online_threat["userId"],
				"durationMs": _online_threat["durationMs"],
			})
		RacingApi.submit_online_race(key, duration_ms, rivals)
		_clear_online_race()

	if track_id_override.is_empty():
		lap_finished.emit(duration_ms, previous_best_ms, is_new_record)
