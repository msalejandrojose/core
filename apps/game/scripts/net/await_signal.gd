class_name AwaitSignal
extends RefCounted

## Espera la primera emisión de una señal, o un timeout — lo que llegue
## antes. Compartido por `PlatformAuth` y `PushDevice`: ambos envuelven un
## plugin nativo cuya respuesta llega por señal, con un límite de tiempo por
## si el SDK nunca responde (jugador cierra el diálogo del sistema sin
## elegir nada, plugin colgado...).
##
## El `Array` para `state`, en vez de variables sueltas, no es capricho: una
## lambda de GDScript captura las variables locales de su función POR VALOR,
## así que reasignar un `bool`/`Variant` local desde dentro de la lambda NO
## se ve desde el bucle que la espera fuera — bug real que hubo aquí mismo
## (ver historial), silencioso porque nada lo ejercitaba todavía sin el
## plugin real instalado. Un `Array` es un tipo por referencia: la lambda y
## el bucle comparten la misma celda.
static func first_or_timeout(
	node: Node, emitter: Object, signal_name: String, timeout_s: float
) -> Variant:
	var timer := node.get_tree().create_timer(timeout_s)
	var state := [false, null] # [done, result]

	var on_signal := func(arg: Variant = true) -> void:
		if state[0]:
			return
		state[0] = true
		state[1] = arg

	emitter.connect(signal_name, on_signal, CONNECT_ONE_SHOT)

	while not state[0]:
		if timer.time_left <= 0.0:
			state[0] = true
			state[1] = null
			break
		await node.get_tree().process_frame

	return state[1]
