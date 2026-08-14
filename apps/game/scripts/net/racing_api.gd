extends Node

## Llamadas de carreras contra la API. Autoload registrado como `RacingApi`.
##
## Traduce entre el vocabulario del juego y el de la API. Lo importante que hace
## esa traducción: el juego habla de "circuito + sentido" y la API de un slug
## por cada combinación, que es exactamente la clave de récord que ya usa
## `GameSettings.track_key()`. Una sola fuente para las dos cosas.

const ApiResponse := preload("res://scripts/net/api_response.gd")

## Versión del build que acompaña a cada tiempo. La API la guarda para poder
## invalidar marcas cuando cambie la física del coche.
const CLIENT_VERSION := "0.1.0"


## Sube un intento. Devuelve la respuesta tal cual: quien llama decide si
## reintentar, encolar o ignorar.
## `ghost_snapshots`: instantáneas ya en formato de red (pos como {x,y,z}, no
## Vector3 — ver `RaceDirector._on_lap_completed`). Vacío si la vuelta no bate
## la marca local: el servidor la descarta igual si no es su mejor marca, pero
## no tiene sentido gastar payload en fantasmas que nunca se van a guardar.
func submit_lap(track_key: String, duration_ms: int, splits_ms: Array, ghost_snapshots: Array = []):
	var body := {
		"durationMs": duration_ms,
		"splitsMs": splits_ms,
		"clientVersion": CLIENT_VERSION,
	}
	if not ghost_snapshots.is_empty():
		body["ghostSnapshots"] = ghost_snapshots
	return await Api.post_json("/racing/tracks/%s/lap-times" % track_key, body)


func leaderboard(track_key: String, limit: int = 20):
	return await Api.get_json("/racing/tracks/%s/leaderboard?limit=%d" % [track_key, limit])


func personal_best(track_key: String):
	return await Api.get_json("/racing/me/best/%s" % track_key)


func tracks():
	return await Api.get_json("/racing/tracks")


## Circuito completo (con geometría), por slug — para construir uno que no
## esté en el catálogo local. Ver `TrackCache` (TASK-245).
func track(slug: String):
	return await Api.get_json("/racing/tracks/%s" % slug)


## Arquetipo, piezas equipadas y sus stats ya combinados. Requiere sesión —
## sin cuenta, `CarLoadout` no llega a llamar a esto y usa el default local.
func car_loadout():
	return await Api.get_json("/racing/cars/me")


## Arquetipos y piezas disponibles para el taller (`WorkshopScreen`).
func car_catalog():
	return await Api.get_json("/racing/cars/catalog")


## Cambia el arquetipo y las piezas equipadas. Los tres huecos de pieza se
## mandan siempre explícitos (null = vacío): el taller conoce el estado
## completo en todo momento, así que no hace falta la semántica de "ausente =
## no tocar" que soporta la API para clientes que solo cambian un hueco.
func set_car_loadout(archetype_id: String, tires_part_id, wing_part_id, chassis_part_id):
	return await Api.patch_json("/racing/cars/me", {
		"archetypeId": archetype_id,
		"tiresPartId": tires_part_id,
		"wingPartId": wing_part_id,
		"chassisPartId": chassis_part_id,
	})


## Factores de terreno de sección (grip, si frena la velocidad punta), para
## poder ajustarlos desde el backoffice sin desplegar el juego (TASK-304).
## Público: hace falta hasta sin cuenta, todo el mundo pisa el mismo hielo.
func terrain_effects():
	return await Api.get_json("/racing/terrain-effects", false)


# --- Grand Prix (TASK-250) -----------------------------------------------------

func grand_prix_list():
	return await Api.get_json("/racing/grand-prix")


## Un Grand Prix con sus circuitos en orden (id, slug y nombre de cada uno) —
## hace falta para resolver a qué manga corresponde `nextTrackId`.
func grand_prix(id: String):
	return await Api.get_json("/racing/grand-prix/%s" % id)


## Devuelve el intento IN_PROGRESS de este jugador si ya había uno (se
## reanuda, TASK-247), o crea uno nuevo.
func grand_prix_start_or_resume(id: String):
	return await Api.post_json("/racing/grand-prix/%s/attempts" % id, {})


func grand_prix_submit_stage(id: String, track_id: String, duration_ms: int):
	return await Api.post_json(
		"/racing/grand-prix/%s/stages/%s/result" % [id, track_id],
		{"durationMs": duration_ms})


func grand_prix_leaderboard(id: String, limit: int = 20):
	return await Api.get_json("/racing/grand-prix/%s/leaderboard?limit=%d" % [id, limit])
