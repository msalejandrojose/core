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
func submit_lap(track_key: String, duration_ms: int, splits_ms: Array):
	return await Api.post_json("/racing/tracks/%s/lap-times" % track_key, {
		"durationMs": duration_ms,
		"splitsMs": splits_ms,
		"clientVersion": CLIENT_VERSION,
	})


func leaderboard(track_key: String, limit: int = 20):
	return await Api.get_json("/racing/tracks/%s/leaderboard?limit=%d" % [track_key, limit])


func personal_best(track_key: String):
	return await Api.get_json("/racing/me/best/%s" % track_key)


func tracks():
	return await Api.get_json("/racing/tracks")


## Arquetipo, piezas equipadas y sus stats ya combinados. Requiere sesión —
## sin cuenta, `CarLoadout` no llega a llamar a esto y usa el default local.
func car_loadout():
	return await Api.get_json("/racing/cars/me")
